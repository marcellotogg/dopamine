import { StringType } from "../byteVector";
import { File } from "../file";
import { Guards } from "../utils";
import { IsoAudioSampleEntry, IsoHandlerBox, IsoMovieHeaderBox, IsoUserDataBox, IsoVisualSampleEntry, Mpeg4Box } from "./mpeg4Boxes";
import Mpeg4BoxFactory from "./mpeg4BoxFactory";
import Mpeg4BoxHeader from "./mpeg4BoxHeader";
import Mpeg4BoxType from "./mpeg4BoxType";

/**
 * This class provides methods for reading important information from an MPEG-4 file.
 */
export default class Mpeg4FileParser {
    /**
     * Contains the file to read from.
     */
    private readonly _file: File;

    /**
     * Contains the first header found in the file.
     */
    private readonly _first_header: Mpeg4BoxHeader;

    /**
     * Contains the ISO movie header box.
     */
    private _mvhd_box: IsoMovieHeaderBox;

    /**
     * Contains the ISO user data boxes.
     */
    private _udta_boxes: IsoUserDataBox[] = [];

    /**
     * Contains the box headers from the top of the file to the "moov" box.
     */
    private _moov_tree: Mpeg4BoxHeader[];

    /**
     * Contains the box headers from the top of the file to the "udta" box.
     */
    private _udta_tree: Mpeg4BoxHeader[];

    /**
     * Contains the "stco" boxes found in the file.
     */
    private _stco_boxes: Mpeg4Box[] = [];

    /**
     * Contains the "stsd" boxes found in the file.
     */
    private _stsd_boxes: Mpeg4Box[] = [];

    /**
     * Contains the position at which the "mdat" box starts.
     */
    private _mdat_start: number = -1;

    /**
     * Contains the position at which the "mdat" box ends.
     */
    private _mdat_end: number = -1;

    /**
     * Constructs and initializes a new instance of @see FileParser for a specified file.
     * @param file A @see File object to perform operations on.
     */
    public constructor(file: File) {
        Guards.notNullOrUndefined(file, "File");

        this._file = file;
        this._first_header = Mpeg4BoxHeader.fromFileAndPosition(file, 0);

        // TODO: is this comparison correct? See original code.
        if (this._first_header.boxType.toString(StringType.UTF8) !== "ftyp") {
            throw new Error("File does not start with 'ftyp' box.");
        }
    }

    /**
     * Gets the movie header box read by the current instance.
     */
    public get movieHeaderBox(): IsoMovieHeaderBox {
        return this._mvhd_box;
    }

    /**
     * Gets all user data boxes read by the current instance.
     */
    public get userDataBoxes(): IsoUserDataBox[] {
        return this._udta_boxes;
    }

    /**
     * Gets the audio sample entry read by the current instance.
     */
    public get audioSampleEntry(): IsoAudioSampleEntry {
        for (const box of this._stsd_boxes) {
            for (const sub of box.children) {
                // TODO: is this correct? See original code?
                if (sub instanceof IsoAudioSampleEntry) {
                    return sub;
                }
            }
        }

        return undefined;
    }

    /**
     * Gets the visual sample entry read by the current instance.
     */
    public get visualSampleEntry(): IsoVisualSampleEntry {
        for (const box of this._stsd_boxes) {
            for (const sub of box.children) {
                // TODO: is this correct? See original code?
                if (sub instanceof IsoVisualSampleEntry) {
                    return sub;
                }
            }
        }

        return undefined;
    }

    /**
     * Gets the box headers for the first "<c>moov</c>" box and
     * all parent boxes up to the top of the file as read by the
     * current instance.
     */
    public get moovTree(): Mpeg4BoxHeader[] {
        return this._moov_tree;
    }

    /**
     * Gets the box headers for the first "<c>udta</c>" box and
     * all parent boxes up to the top of the file as read by the
     * current instance.
     */
    public get udtaTree(): Mpeg4BoxHeader[] {
        return this._udta_tree;
    }

    /**
     * Gets all chunk offset boxes read by the current instance.
     */
    public get chunkOffsetBoxes(): Mpeg4Box[] {
        return this._stco_boxes;
    }

    /**
     * Gets the position at which the mdat box starts.
     */
    public get mdatStartPosition(): number {
        return this._mdat_start;
    }

    /**
     * Gets the position at which the mdat box ends.
     */
    public get mdatEndPosition(): number {
        return this._mdat_end;
    }

    /**
     * Get the User Data Box
     */
    public get userDataBox(): IsoUserDataBox {
        return this.userDataBoxes.length === 0 ? undefined : this.userDataBoxes[0];
    }

    /**
     * Parses the file referenced by the current instance,
     * searching for box headers that will be useful in saving
     * the file.
     */
    public parseBoxHeaders(): void {
        try {
            this.resetFields();
            this.parseBoxHeadersFromStartEndAndParents(this._first_header.totalBoxSize, this._file.length, undefined);
        } catch (e) {
            this._file.markAsCorrupt(e.message);
        }
    }

    /**
     * Parses the file referenced by the current instance, searching for tags.
     */
    public parseTag(): void {
        try {
            this.resetFields();
            this.parseTagFromStartEndAndParents(this._first_header.totalBoxSize, this._file.length, undefined);
        } catch (e) {
            this._file.markAsCorrupt(e.message);
        }
    }

    /**
     * Parses the file referenced by the current instance, searching for tags and properties.
     */
    public parseTagAndProperties(): void {
        try {
            this.resetFields();
            this.parseTagAndPropertiesFromStartEndHandlerAndParents(
                this._first_header.totalBoxSize,
                this._file.length,
                undefined,
                undefined
            );
        } catch (e) {
            this._file.markAsCorrupt(e.message);
        }
    }

    /**
     * Parses the file referenced by the current instance, searching for chunk offset boxes.
     */
    public parseChunkOffsets(): void {
        try {
            this.resetFields();
            this.ParseChunkOffsetsFromStartAndEnd(this._first_header.totalBoxSize, this._file.length);
        } catch (e) {
            this._file.markAsCorrupt(e.Message);
        }
    }

    /**
     * Parses boxes for a specified range, looking for headers.
     * @param start A value specifying the seek position at which to start reading.
     * @param end A value specifying the seek position at which to stop reading.
     * @param parents A @see Mpeg4BoxHeader[] object containing all the parent
     * handlers that apply to the range.
     */
    private parseBoxHeadersFromStartEndAndParents(start: number, end: number, parents: Mpeg4BoxHeader[]): void {
        let header: Mpeg4BoxHeader;

        for (let position = start; position < end; position += header.totalBoxSize) {
            header = Mpeg4BoxHeader.fromFileAndPosition(this._file, position);

            if ((this._moov_tree === null || this._moov_tree === undefined) && header.boxType === Mpeg4BoxType.Moov) {
                const new_parents: Mpeg4BoxHeader[] = Mpeg4FileParser.addParent(parents, header);
                this._moov_tree = new_parents;
                this.parseBoxHeadersFromStartEndAndParents(header.headerSize + position, header.totalBoxSize + position, new_parents);
            } else if (
                header.boxType === Mpeg4BoxType.Mdia ||
                header.boxType === Mpeg4BoxType.Minf ||
                header.boxType === Mpeg4BoxType.Stbl ||
                header.boxType === Mpeg4BoxType.Trak
            ) {
                this.parseBoxHeadersFromStartEndAndParents(
                    header.headerSize + position,
                    header.totalBoxSize + position,
                    Mpeg4FileParser.addParent(parents, header)
                );
            } else if ((this._udta_tree === null || this._udta_tree === undefined) && header.boxType === Mpeg4BoxType.Udta) {
                // For compatibility, we still store the tree to the first udta
                // block. The proper way to get this info is from the individual
                // IsoUserDataBox.ParentTree member.
                this._udta_tree = Mpeg4FileParser.addParent(parents, header);
            } else if (header.boxType === Mpeg4BoxType.Mdat) {
                this._mdat_start = position;
                this._mdat_end = position + header.totalBoxSize;
            }

            if (header.totalBoxSize === 0) {
                break;
            }
        }
    }

    /**
     * Parses boxes for a specified range, looking for tags.
     * @param start A value specifying the seek position at which to start reading.
     * @param end A value specifying the seek position at which to stop reading.
     * @param parents A @see Mpeg4BoxHeader[] of @see Mpeg4BoxHeader parents.
     */
    private parseTagFromStartEndAndParents(start: number, end: number, parents: Mpeg4BoxHeader[]): void {
        let header: Mpeg4BoxHeader;

        for (let position = start; position < end; position += header.totalBoxSize) {
            header = Mpeg4BoxHeader.fromFileAndPosition(this._file, position);

            if (header.boxType === Mpeg4BoxType.Moov) {
                this.parseTagFromStartEndAndParents(
                    header.headerSize + position,
                    header.totalBoxSize + position,
                    Mpeg4FileParser.addParent(parents, header)
                );
            } else if (
                header.boxType === Mpeg4BoxType.Mdia ||
                header.boxType === Mpeg4BoxType.Minf ||
                header.boxType === Mpeg4BoxType.Stbl ||
                header.boxType === Mpeg4BoxType.Trak
            ) {
                this.parseTagFromStartEndAndParents(
                    header.headerSize + position,
                    header.totalBoxSize + position,
                    Mpeg4FileParser.addParent(parents, header)
                );
            } else if (header.boxType === Mpeg4BoxType.Udta) {
                const udtaBox = Mpeg4BoxFactory.createBoxFromFileAndHeader(this._file, header) as IsoUserDataBox;

                // Since we can have multiple udta boxes, save the parent for each one
                const new_parents: Mpeg4BoxHeader[] = Mpeg4FileParser.addParent(parents, header);
                udtaBox.parentTree = new_parents;

                this._udta_boxes.push(udtaBox);
            } else if (header.boxType === Mpeg4BoxType.Mdat) {
                this._mdat_start = position;
                this._mdat_end = position + header.totalBoxSize;
            }

            if (header.totalBoxSize === 0) {
                break;
            }
        }
    }

    /**
     * Parses boxes for a specified range, looking for tags and properties.
     * @param start A value specifying the seek position at which to start reading.
     * @param end A value specifying the seek position at which to stop reading.
     * @param handler A @see IsoHandlerBox object that applied to the range being searched.
     * @param parents A @see Mpeg4BoxHeader[] of @see Mpeg4BoxHeader parents.
     */
    private parseTagAndPropertiesFromStartEndHandlerAndParents(
        start: number,
        end: number,
        handler: IsoHandlerBox,
        parents: Mpeg4BoxHeader[]
    ) {
        let header: Mpeg4BoxHeader;

        for (let position = start; position < end; position += header.totalBoxSize) {
            header = Mpeg4BoxHeader.fromFileAndPosition(this._file, position);

            if (header.boxType === Mpeg4BoxType.Moov) {
                this.parseTagAndPropertiesFromStartEndHandlerAndParents(
                    header.headerSize + position,
                    header.totalBoxSize + position,
                    handler,
                    Mpeg4FileParser.addParent(parents, header)
                );
            } else if (
                header.boxType === Mpeg4BoxType.Mdia ||
                header.boxType === Mpeg4BoxType.Minf ||
                header.boxType === Mpeg4BoxType.Stbl ||
                header.boxType === Mpeg4BoxType.Trak
            ) {
                this.parseTagAndPropertiesFromStartEndHandlerAndParents(
                    header.headerSize + position,
                    header.totalBoxSize + position,
                    handler,
                    Mpeg4FileParser.addParent(parents, header)
                );
            } else if (header.boxType === Mpeg4BoxType.Stsd) {
                this._stsd_boxes.push(Mpeg4BoxFactory.createBoxFromFileHeaderAndHandler(this._file, header, handler));
            } else if (header.boxType === Mpeg4BoxType.Hdlr) {
                handler = Mpeg4BoxFactory.createBoxFromFileHeaderAndHandler(this._file, header, handler) as IsoHandlerBox;
            } else if ((this._mvhd_box === null || this._mvhd_box === undefined) && header.boxType === Mpeg4BoxType.Mvhd) {
                this._mvhd_box = Mpeg4BoxFactory.createBoxFromFileHeaderAndHandler(this._file, header, handler) as IsoMovieHeaderBox;
            } else if (header.boxType === Mpeg4BoxType.Udta) {
                const udtaBox: IsoUserDataBox = Mpeg4BoxFactory.createBoxFromFileHeaderAndHandler(
                    this._file,
                    header,
                    handler
                ) as IsoUserDataBox;

                // Since we can have multiple udta boxes, save the parent for each one
                const new_parents: Mpeg4BoxHeader[] = Mpeg4FileParser.addParent(parents, header);
                udtaBox.parentTree = new_parents;

                this._udta_boxes.push(udtaBox);
            } else if (header.boxType === Mpeg4BoxType.Mdat) {
                this._mdat_start = position;
                this._mdat_end = position + header.totalBoxSize;
            }

            if (header.totalBoxSize === 0) {
                break;
            }
        }
    }

    /**
     * Parses boxes for a specified range, looking for chunk offset boxes.
     * @param start A value specifying the seek position at which to start reading.
     * @param end A value specifying the seek position at which to stop reading.
     */
    private ParseChunkOffsetsFromStartAndEnd(start: number, end: number): void {
        let header: Mpeg4BoxHeader;

        for (let position = start; position < end; position += header.totalBoxSize) {
            header = Mpeg4BoxHeader.fromFileAndPosition(this._file, position);

            if (header.boxType === Mpeg4BoxType.Moov) {
                this.ParseChunkOffsetsFromStartAndEnd(header.headerSize + position, header.totalBoxSize + position);
            } else if (
                header.boxType === Mpeg4BoxType.Moov ||
                header.boxType === Mpeg4BoxType.Mdia ||
                header.boxType === Mpeg4BoxType.Minf ||
                header.boxType === Mpeg4BoxType.Stbl ||
                header.boxType === Mpeg4BoxType.Trak
            ) {
                this.ParseChunkOffsetsFromStartAndEnd(header.headerSize + position, header.totalBoxSize + position);
            } else if (header.boxType === Mpeg4BoxType.Stco || header.boxType === Mpeg4BoxType.Co64) {
                this._stco_boxes.push(Mpeg4BoxFactory.createBoxFromFileAndHeader(this._file, header));
            } else if (header.boxType === Mpeg4BoxType.Mdat) {
                this._mdat_start = position;
                this._mdat_end = position + header.totalBoxSize;
            }

            if (header.totalBoxSize === 0) {
                break;
            }
        }
    }

    /**
     * Resets all internal fields.
     */
    private resetFields(): void {
        this._mvhd_box = undefined;
        this._udta_boxes = [];
        this._moov_tree = undefined;
        this._udta_tree = undefined;
        this._stco_boxes = [];
        this._stsd_boxes = [];
        this._mdat_start = -1;
        this._mdat_end = -1;
    }

    /**
     * Adds a parent to the end of an existing list of parents.
     * @param parents A @see Mpeg4BoxHeader[] object containing an existing list of parents.
     * @param current A @see Mpeg4BoxHeader object to add to the list.
     * @returns A @see Mpeg4BoxHeader[] object containing the list
     * of parents, including the added header.
     */
    private static addParent(parents: Mpeg4BoxHeader[], current: Mpeg4BoxHeader): Mpeg4BoxHeader[] {
        const boxes: Mpeg4BoxHeader[] = [];

        if (parents !== null && parents !== undefined) {
            boxes.push(...parents);
        }

        boxes.push(current);

        return boxes;
    }
}

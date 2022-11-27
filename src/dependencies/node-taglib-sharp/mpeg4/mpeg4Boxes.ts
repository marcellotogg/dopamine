import { ByteVector, StringType } from "../byteVector";
import { File } from "../file";
import { IAudioCodec, IVideoCodec, MediaTypes } from "../properties";
import { Guards, StringUtils } from "../utils";
import { AppleDataBoxFlagType } from "./appleDataBoxFlagType";
import { DescriptorTag } from "./descriptorTag";
import Mpeg4BoxFactory from "./mpeg4BoxFactory";
import Mpeg4BoxHeader from "./mpeg4BoxHeader";
import Mpeg4BoxType from "./mpeg4BoxType";

/**
 * This file contains all boxes. All boxes had to be grouped into a single file due to circular dependencies
 * (e.g.: Mpeg4Box imports IsoHandlerBox while IsoHandlerBox extends Mpeg4Box and thus imports Mpeg4Box).
 * These circular dependencies cause runtime error: "Cannot access Mpeg4Box before initialization".
 * Below is an index of all classes contained in this file. This allows quick jumping to them.
 * @see Mpeg4Box
 * @see FullBox
 * @see AppleAdditionalInfoBox
 * @see AppleAnnotationBox
 * @see AppleDataBox
 * @see AppleElementaryStreamDescriptor
 * @see AppleItemListBox
 * @see IsoSampleEntry
 * @see IsoAudioSampleEntry
 * @see IsoChunkLargeOffsetBox
 * @see IsoChunkOffsetBox
 * @see IsoFreeSpaceBox
 * @see IsoHandlerBox
 * @see IsoMetaBox
 * @see IsoMovieHeaderBox
 * @see IsoSampleDescriptionBox
 * @see IsoSampleTableBox
 * @see IsoUserDataBox
 * @see IsoVisualSampleEntry
 * @see TextBox
 * @see UnknownBox
 * @see UrlBox
 */

/**
 *  Provides a generic implementation of a ISO/IEC 14496-12 box.
 */
export class Mpeg4Box {
    /**
     * Contains the box header.
     */
    private _header: Mpeg4BoxHeader;

    /**
     * Contains the position of the box data.
     */
    private _dataPosition: number;

    /**
     * The handler box that applies to the current instance.
     */
    private _handler: IsoHandlerBox;

    /**
     * The children of the current instance.
     */
    public children: Mpeg4Box[] = [];

    protected constructor() {}

    /**
     * Initializes a new instance of @see Mpeg4Box with a specified header and handler.
     * @param header A @see Mpeg4BoxHeader object describing the new instance.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance,
     * or undefined if no handler applies.
     */
    protected initializeFromHeaderAndHandler(header: Mpeg4BoxHeader, handler: IsoHandlerBox): void {
        this._header = header;
        this._dataPosition = header.position + header.headerSize;
        this._handler = handler;
    }

    /**
     * Initializes a new instance of @see Mpeg4Box with a specified header.
     * @param header A @see Mpeg4BoxHeader object describing the new instance.
     */
    protected initializeFromHeader(header: Mpeg4BoxHeader): void {
        return this.initializeFromHeaderAndHandler(header, undefined);
    }

    /**
     * Initializes a new instance of @see Mpeg4Box with a specified box type.
     * @param type A @see ByteVector object containing the box type to use for the new instance.
     */
    protected initializeFromType(type: ByteVector): void {
        return this.initializeFromHeader(Mpeg4BoxHeader.fromType(type));
    }

    /**
     * Gets the MPEG-4 box type of the current instance.
     */
    public get boxType(): ByteVector {
        return this._header.boxType;
    }

    /**
     * Gets the total size of the current instance as it last appeared on disk.
     */
    public get size(): number {
        return this._header.totalBoxSize;
    }

    /**
     * Gets and sets the data contained in the current instance.
     */
    public get data(): ByteVector {
        return undefined;
    }
    public set data(v: ByteVector) {}

    /**
     * Gets whether or not the current instance has children.
     */
    public get hasChildren(): boolean {
        return this.children !== null && this.children !== undefined && this.children.length > 0;
    }

    /**
     * Gets the handler box that applies to the current instance.
     */
    public get handler(): IsoHandlerBox {
        return this._handler;
    }

    /**
     * Gets the size of the data contained in the current instance, minus the size of any box specific headers.
     */
    protected get dataSize(): number {
        return this._header.dataSize + this._dataPosition - this.dataPosition;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return this._dataPosition;
    }

    /**
     * Gets the header of the current instance.
     */
    protected get header(): Mpeg4BoxHeader {
        return this._header;
    }

    /**
     * Renders the current instance, including its children, to a new ByteVector object.
     * @returns A @see ByteVector object containing the rendered version of the current instance.
     */
    public render(): ByteVector {
        return this.renderUsingTopData(ByteVector.empty());
    }

    /**
     *  Gets a child box from the current instance by finding a matching box type.
     * @param type  A @see ByteVector object containing the box type to match.
     * @returns  A @see Mpeg4Box object containing the matched box, or undefined if no matching box was found.
     */
    public getChild(type: ByteVector): Mpeg4Box {
        if (this.children === null || this.children === undefined) {
            return undefined;
        }

        for (const box of this.children) {
            if (box.boxType === type) {
                return box;
            }
        }

        return undefined;
    }

    /**
     * Gets all child boxes from the current instance by finding a matching box type.
     * @param type A @see ByteVector object containing the box type to match.
     * @returns A @see Mpeg4Box[] object containing the matched box, or undefined if no matching boxes was found.
     */
    public getChildren(type: ByteVector): Mpeg4Box[] {
        if (this.children === null || this.children === undefined) {
            return undefined;
        }

        const boxes: Mpeg4Box[] = [];

        for (const box of this.children) {
            if (box.boxType === type) {
                boxes.push(box);
            }
        }

        if (boxes.length > 0) {
            return boxes;
        }

        return undefined;
    }

    /**
     * Gets a child box from the current instance by finding a matching box type, searching recursively.
     * @param type  A @see ByteVector object containing the box type to match.
     * @returns A @see Mpeg4Box object containing the matched box, or undefined if no matching box was found.
     */
    public getChildRecursively(type: ByteVector): Mpeg4Box {
        if (this.children === null || this.children === undefined) {
            return undefined;
        }

        for (const box of this.children) {
            if (box.boxType === type) {
                return box;
            }
        }

        for (const box of this.children) {
            const childBox: Mpeg4Box = box.getChildRecursively(type);

            if (childBox !== null && childBox !== undefined) {
                return childBox;
            }
        }

        return undefined;
    }

    /**
     * Removes all children with a specified box type from the current instance.
     * @param type A @see ByteVector object containing the box type to remove.
     */
    public removeChildByType(type: ByteVector): void {
        if (this.children === null || this.children === undefined) {
            return;
        }

        for (const box of this.children) {
            if (box.boxType === type) {
                const index = this.children.indexOf(box);

                if (index > -1) {
                    this.children.splice(index, 1);
                }
            }
        }
    }

    /**
     * Removes a specified box from the current instance.
     * @param box A @see Mpeg4Box object to remove from the current instance.
     */
    public removeChildByBox(box: Mpeg4Box): void {
        if (this.children === null || this.children === undefined) {
            return;
        }

        const index = this.children.indexOf(box);

        if (index > -1) {
            this.children.splice(index, 1);
        }
    }

    /**
     * Adds a specified box to the current instance.
     * @param box A @see Mpeg4Box object to add to the current instance.
     */
    public addChild(box: Mpeg4Box): void {
        if (this.children === null || this.children === undefined) {
            return;
        }

        this.children.push(box);
    }

    /**
     * Removes all children from the current instance.
     */
    public clearChildren(): void {
        if (this.children === null || this.children === undefined) {
            return;
        }

        this.children = [];
    }

    /**
     * Loads the children of the current instance from a specified file using the internal data position and size.
     * @param file The File from which the current instance was read and from which to read the children.
     * @returns A @see Mpeg4Box[] object enumerating the boxes read from the file.
     */
    public loadChildren(file: File): Mpeg4Box[] {
        Guards.notNullOrUndefined(file, "file");

        const children: Mpeg4Box[] = [];

        let position: number = this.dataPosition;
        const end: number = position + this.dataSize;

        this._header.box = this;

        while (position < end) {
            const child: Mpeg4Box = Mpeg4BoxFactory.createBoxFromFilePositionParentHandlerAndIndex(
                file,
                position,
                this._header,
                this.handler,
                children.length
            );

            if (child.size === 0) {
                break;
            }

            children.push(child);
            position += child.size;
        }

        this._header.box = undefined;

        return children;
    }

    /**
     * Loads the data of the current instance from a specified file using the internal data position and size.
     * @param file The @see File from which the current instance was read and from which to read the data.
     * @returns A @see ByteVector object containing the data read from the file.
     */
    public loadData(file: File): ByteVector {
        Guards.notNullOrUndefined(file, "file");

        file.seek(this.dataPosition);

        return file.readBlock(this.dataSize);
    }

    /**
     * Renders the current instance, including its children, to a new @see ByteVector object, preceding the
     * contents with a specified block of data.
     * @param topData  A @see ByteVector object containing box specific header data to precede the content.
     * @returns A @see ByteVector object containing the rendered version of the current instance.
     */
    protected renderUsingTopData(topData: ByteVector): ByteVector {
        let freeFound = false;
        const output: ByteVector = ByteVector.empty();

        if (this.children !== null && this.children !== undefined) {
            for (const box of this.children) {
                if (box instanceof IsoFreeSpaceBox) {
                    freeFound = true;
                } else {
                    output.addByteVector(box.render());
                }
            }
        } else if (this.data !== null && this.data !== undefined) {
            output.addByteVector(this.data);
        }

        // If there was a free, don't take it away, and let meta be a special case.
        if (freeFound || this.boxType === Mpeg4BoxType.Meta) {
            const sizeDifference: number = this.dataSize - output.length;

            if (this._header.dataSize !== 0 && sizeDifference >= 8) {
                // If we have room for free space, add it so we don't have to resize the file.
                output.addByteVector(IsoFreeSpaceBox.fromPadding(sizeDifference).render());
            } else {
                // If we're getting bigger, get a lot bigger so we might not have to again.
                output.addByteVector(IsoFreeSpaceBox.fromPadding(2048).render());
            }
        }

        // Adjust the header's data size to match the content.
        this._header.dataSize = topData.length + output.length;

        // Render the full box.
        output.insert(0, topData);
        output.insert(0, this._header.render());

        return output;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see Mpeg4Box to provide an implementation of a ISO/IEC 14496-12 FullBox.
 */
export class FullBox extends Mpeg4Box {
    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return super.dataPosition + 4;
    }

    /**
     * Gets and sets the version number of the current instance.
     */
    public version: number;

    /**
     * Gets and sets the flags that apply to the current instance.
     */
    public flags: number;

    protected constructor() {
        super();
    }

    /**
     * Initializes a new instance of @see FullBox with a provided header and handler
     * by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     */
    protected initializeFromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): void {
        Guards.notNullOrUndefined(file, "file");

        this.initializeFromHeaderAndHandler(header, handler);

        file.seek(super.dataPosition);
        const headerData: ByteVector = file.readBlock(4);

        this.version = headerData.get(0);
        this.flags = headerData.subarray(1, 3).toUint();
    }

    /**
     * Initializes a new instance of @see FullBox with a provided header, version, and flags.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param version A value containing the version of the new instance.
     */
    protected initializeFromHeaderVersionAndFlags(header: Mpeg4BoxHeader, version: number, flags: number): void {
        this.initializeFromHeader(header);

        this.version = version;
        this.flags = flags;
    }

    /**
     * Initializes a new instance of @see FullBox with a provided header, version, and flags.
     * @param type A @see ByteVector object containing the four byte box type.
     * @param version A value containing the version of the new instance.
     * @param flags A value containing the flags for the new instance.
     * @returns A new instance of @see FullBox.
     */
    protected initializeFromTypeVersionAndFlags(type: ByteVector, version: number, flags: number): void {
        return this.initializeFromHeaderVersionAndFlags(Mpeg4BoxHeader.fromType(type), version, flags);
    }

    /**
     * Renders the current instance, including its children, to a new @see ByteVector object, preceding the
     * contents with a specified block of data.
     * @param topData A @see ByteVector object containing box specific header data to precede the content.
     * @returns A @see ByteVector object containing the rendered version of the current instance.
     */
    protected renderUsingTopData(topData: ByteVector): ByteVector {
        // TODO: not sure if this is correct. I don't understand the syntax in the original code.
        const output: ByteVector = ByteVector.concatenate(
            ByteVector.fromInt(this.version),
            ByteVector.fromUint(this.flags).subarray(1, 3),
            topData
        );

        return super.renderUsingTopData(output);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 *  This class extends @see FullBox to provide an implementation of an Apple AdditionalInfoBox.
 */
export class AppleAdditionalInfoBox extends FullBox {
    /**
     * Contains the box data.
     */
    private _data: ByteVector;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see AppleAdditionalInfoBox with a provided header
     * and handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see AppleAdditionalInfoBox.
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): AppleAdditionalInfoBox {
        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const appleAdditionalInfoBox: AppleAdditionalInfoBox = base as AppleAdditionalInfoBox;
        appleAdditionalInfoBox.data = file.readBlock(appleAdditionalInfoBox.dataSize > 0 ? appleAdditionalInfoBox.dataSize : 0);

        return appleAdditionalInfoBox;
    }

    /**
     * Constructs and initializes a new instance of @see FullBox with a provided header, version, and flags.
     * @param type A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param version A value containing the version of the new instance.
     * @param flags A value containing the flags for the new instance.
     * @returns A new instance of @see FullBox.
     */
    public static fromTypeVersionAndFlags(type: ByteVector, version: number, flags: number): AppleAdditionalInfoBox {
        const base: FullBox = FullBox.fromTypeVersionAndFlags(type, version, flags);
        const appleAdditionalInfoBox: AppleAdditionalInfoBox = base as AppleAdditionalInfoBox;

        return appleAdditionalInfoBox;
    }

    /**
     * Gets and sets the data contained in the current instance.
     */
    public get data(): ByteVector {
        return this._data;
    }
    public set data(v: ByteVector) {
        this._data = v ?? ByteVector.empty();
    }

    /**
     * Gets and sets the text contained in the current instance.
     */
    public get text(): string {
        return StringUtils.trimStart(this._data.toString(StringType.Latin1), "\0");
    }
    public set text(v: string) {
        this._data = ByteVector.fromString(v, StringType.Latin1);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see Mpeg4Box to provide an implementation of an Apple AnnotationBox.
 */
export default class AppleAnnotationBox extends Mpeg4Box {
    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see AppleAnnotationBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see AppleAnnotationBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): AppleAnnotationBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const appleAnnotationBox: AppleAnnotationBox = base as AppleAnnotationBox;
        appleAnnotationBox.children = appleAnnotationBox.loadChildren(file);

        return appleAnnotationBox;
    }

    /**
     * Constructs and initializes a new instance of @see AppleAnnotationBox of specified type with no children.
     * @param type A @see ByteVector object containing a 4-byte box type.
     * @returns A new instance of @see AppleAnnotationBox
     */
    public static fromType(type: ByteVector): AppleAnnotationBox {
        const base: Mpeg4Box = Mpeg4Box.fromType(type);
        const appleAnnotationBox: AppleAnnotationBox = base as AppleAnnotationBox;
        appleAnnotationBox.children = [];

        return appleAnnotationBox;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of an Apple DataBox.
 */
export class AppleDataBox extends FullBox {
    /**
     * Contains the box data.
     */
    private _data: ByteVector;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see AppleDataBox with a provided header and handler
     * by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader  object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see AppleDataBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): AppleDataBox {
        Guards.notNullOrUndefined(file, "file");

        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const appleDataBox: AppleDataBox = base as AppleDataBox;
        appleDataBox.data = appleDataBox.loadData(file);

        return appleDataBox;
    }

    /**
     * Constructs and initializes a new instance of @see AppleDataBox with specified data and flags.
     * @param data A @see ByteVector object containing the data to store in the new instance.
     * @param flags A value containing flags to use for the new instance.
     * @returns
     */
    public static fromDataAndFlags(data: ByteVector, flags: number): AppleDataBox {
        const base: FullBox = FullBox.fromTypeVersionAndFlags(ByteVector.fromString("data", StringType.UTF8), 0, flags);
        const appleDataBox: AppleDataBox = base as AppleDataBox;

        return appleDataBox;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return super.dataPosition + 4;
    }

    /**
     * Gets and sets the data contained in the current instance.
     */
    public get data(): ByteVector {
        return this._data;
    }
    public set data(v: ByteVector) {
        this._data = v ?? ByteVector.empty();
    }

    /**
     * Gets and sets the text contained in the current instance.
     */
    public get text(): string {
        return (this.flags & (<number>AppleDataBoxFlagType.ContainsText)) !== 0 ? this.data.toString(StringType.UTF8) : undefined;
    }
    public set text(v: string) {
        this.flags = <number>AppleDataBoxFlagType.ContainsText;
        this.data = ByteVector.fromString(v, StringType.UTF8);
    }

    /**
     * Renders the current instance, including its children, to a new @see ByteVector object, preceding the
     * contents with a specified block of data.
     * @param topData A @see ByteVector object containing box specific header data to precede the content.
     * @returns
     */
    protected renderUsingTopData(topData: ByteVector): ByteVector {
        // TODO: not sure if this is correct. I don't understand the syntax in the original code.
        const output: ByteVector = ByteVector.concatenate(ByteVector.fromInt(4), topData);

        return super.renderUsingTopData(output);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of an Apple ElementaryStreamDescriptor.
 * This box may appear as a child of a @see IsoAudioSampleEntry and provided further information about an audio stream.
 */
export class AppleElementaryStreamDescriptor extends FullBox {
    /**
     * The ES_ID of another elementary stream on which this elementary stream depends
     */
    private _dependsOn_ES_ID: number;

    /**
     * Indicates that a dependsOn_ES_ID will follow
     */
    private _stream_dependence_flag: boolean;

    /**
     * OCR Stream Flag
     */
    private _ocr_stream_flag: boolean;

    /**
     * OCR ES_ID
     */
    private _OCR_ES_Id: number;

    /**
     * Indicates that a URLstring will follow
     */
    private _URL_flag: boolean;

    /**
     * Length of URL String
     */
    private _URLlength: number;

    /**
     * URL String of URLlength, contains a URL that shall point to the location of an SL-packetized stream by name.
     */
    private _URLstring: string;

    /**
     * Indicates that this stream is used for upstream information
     */
    private _upStream: boolean;

    /**
     * Contains the maximum bitrate.
     */
    private _max_bitrate: number;

    /**
     * Contains the average bitrate.
     */
    private _average_bitrate: number;

    /**
     * The ID of the stream described by the current instance.
     */
    private _streamId: number;

    /**
     * The priority of the stream described by the current instance.
     */
    private _streamPriority: number;

    /**
     * The object type ID of the stream described by the current instance.
     */
    private _objectTypeId: number;

    /**
     * The type the stream described by the current instance.
     */
    private _streamType: number;

    /**
     * The buffer size DB value the stream described by the current instance.
     */
    private _bufferSizeDB: number;

    /**
     * The decoder config data of stream described by the current instance.
     */
    private _decoderConfig: ByteVector;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see AppleElementaryStreamDescriptor with a provided
     * header and handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see AppleElementaryStreamDescriptor
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): AppleElementaryStreamDescriptor {
        /* ES_Descriptor Specifications
         *  Section 7.2.6.5 http://ecee.colorado.edu/~ecen5653/ecen5653/papers/ISO%2014496-1%202004.PDF
         */

        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const appleElementaryStreamDescriptor: AppleElementaryStreamDescriptor = base as AppleElementaryStreamDescriptor;

        const box_data: ByteVector = file.readBlock(appleElementaryStreamDescriptor.dataSize);
        appleElementaryStreamDescriptor._decoderConfig = ByteVector.empty();
        let offset: number = 0;

        // Elementary Stream Descriptor Tag
        if (<DescriptorTag>box_data.get(offset++) !== DescriptorTag.ES_DescrTag) {
            throw new Error("Invalid Elementary Stream Descriptor, missing tag.");
        }

        // We have a descriptor tag. Check that the remainder of the tag is at least
        // [Base (3 bytes) + DecoderConfigDescriptor (15 bytes) + SLConfigDescriptor (3 bytes) + OtherDescriptors] bytes long
        const es_length: number = appleElementaryStreamDescriptor.readLength(box_data, offset);
        let min_es_length: number = 3 + 15 + 3; // Base minimum length

        if (es_length < min_es_length) {
            throw new Error("Insufficient data present.");
        }

        appleElementaryStreamDescriptor._streamId = box_data.subarray(offset, 2).toUshort();
        offset += 2; // Done with ES_ID

        // 1st bit
        appleElementaryStreamDescriptor._stream_dependence_flag = <number>((box_data.get(offset) >> 7) & 0x1) === 0x1 ? true : false;

        // 2nd bit
        appleElementaryStreamDescriptor._URL_flag = <number>((box_data.get(offset) >> 6) & 0x1) === 0x1 ? true : false;

        // 3rd bit
        appleElementaryStreamDescriptor._ocr_stream_flag = <number>((box_data.get(offset) >> 5) & 0x1) === 0x1 ? true : false;

        // Last 5 bits and we're done with this byte
        appleElementaryStreamDescriptor._streamPriority = <number>(box_data.get(offset++) & 0x1f);

        if (appleElementaryStreamDescriptor._stream_dependence_flag) {
            min_es_length += 2; // We need 2 more bytes

            if (es_length < min_es_length) {
                throw new Error("Insufficient data present.");
            }

            appleElementaryStreamDescriptor._dependsOn_ES_ID = box_data.subarray(offset, 2).toUshort();
            offset += 2; // Done with stream dependence
        }

        if (appleElementaryStreamDescriptor._URL_flag) {
            min_es_length += 2; // We need 1 more byte

            if (es_length < min_es_length) {
                throw new Error("Insufficient data present.");
            }

            appleElementaryStreamDescriptor._URLlength = box_data.get(offset++); // URL Length
            min_es_length += appleElementaryStreamDescriptor._URLlength; // We need URLength more bytes

            if (es_length < min_es_length) {
                throw new Error("Insufficient data present.");
            }

            appleElementaryStreamDescriptor._URLstring = box_data
                .subarray(offset, appleElementaryStreamDescriptor._URLlength)
                .toString(StringType.UTF8); // URL name
            offset += appleElementaryStreamDescriptor._URLlength; // Done with URL name
        }

        if (appleElementaryStreamDescriptor._ocr_stream_flag) {
            min_es_length += 2; // We need 2 more bytes

            if (es_length < min_es_length) {
                throw new Error("Insufficient data present.");
            }

            appleElementaryStreamDescriptor._OCR_ES_Id = box_data.subarray(offset, 2).toUshort();
            offset += 2; // Done with OCR
        }

        // Loop through all trailing Descriptors Tags
        while (offset < appleElementaryStreamDescriptor.dataSize) {
            const tag: DescriptorTag = <DescriptorTag>box_data.get(offset++);

            switch (tag) {
                case DescriptorTag.DecoderConfigDescrTag: // DecoderConfigDescriptor
                    {
                        /**
                         * Check that the remainder of the tag is at least 13 bytes long
                         * (13 + DecoderSpecificInfo[] + profileLevelIndicationIndexDescriptor[])
                         */
                        if (appleElementaryStreamDescriptor.readLength(box_data, offset) < 13) {
                            throw new Error("Could not read data. Too small.");
                        }

                        // Read a lot of good info.
                        appleElementaryStreamDescriptor._objectTypeId = box_data.get(offset++);

                        // First 6 bits
                        appleElementaryStreamDescriptor._streamType = <number>(box_data.get(offset) >> 2);

                        // 7th bit and we're done with the stream bits
                        appleElementaryStreamDescriptor._upStream = ((box_data.get(offset++) >> 1) & 0x1) === 0x1 ? true : false;

                        appleElementaryStreamDescriptor._bufferSizeDB = box_data.subarray(offset, 3).toUint();
                        offset += 3; // Done with bufferSizeDB

                        appleElementaryStreamDescriptor._max_bitrate = box_data.subarray(offset, 4).toUint();
                        offset += 4; // Done with maxBitrate

                        appleElementaryStreamDescriptor._average_bitrate = box_data.subarray(offset, 4).toUint();
                        offset += 4; // Done with avgBitrate

                        // If there's a DecoderSpecificInfo[] array at the end it'll pick it up in the while loop
                    }
                    break;

                case DescriptorTag.DecSpecificInfoTag: // DecoderSpecificInfo
                    {
                        // The rest of the info is decoder specific.
                        const length: number = appleElementaryStreamDescriptor.readLength(box_data, offset);

                        appleElementaryStreamDescriptor._decoderConfig = box_data.subarray(offset, length);
                        offset += length; // We're done with the config
                    }
                    break;

                case DescriptorTag.SLConfigDescrTag: // SLConfigDescriptor
                    {
                        // The rest of the info is SL specific.
                        const length: number = appleElementaryStreamDescriptor.readLength(box_data, offset);

                        offset += length; // Skip the rest of the descriptor as reported in the length so we can move onto the next one
                    }
                    break;

                case DescriptorTag.Forbidden_00:
                case DescriptorTag.Forbidden_FF:
                    throw new Error("Invalid Descriptor tag.");
                default: {
                    /**
                     * TODO: Should we handle other optional descriptor tags?
                     * ExtensionDescriptor extDescr[0 .. 255];
                     * LanguageDescriptor langDescr[0 .. 1];
                     * IPI_DescPointer ipiPtr[0 .. 1];
                     * IP_IdentificationDataSet ipIDS[0 .. 1];
                     * QoS_Descriptor qosDescr[0 .. 1];
                     */
                    // Every descriptor starts with a length
                    const length: number = appleElementaryStreamDescriptor.readLength(box_data, offset);

                    offset += length; // Skip the rest of the descriptor as reported in the length so we can move onto the next one

                    break;
                }
            }
        }

        return appleElementaryStreamDescriptor;
    }

    /**
     * Gets the ID of the stream described by the current instance.
     */
    public get streamId(): number {
        return this._streamId;
    }

    /**
     * Gets the priority of the stream described by the current instance.
     */
    public get streamPriority(): number {
        return this._streamPriority;
    }

    /**
     * Gets the object type ID of the stream described by the current instance.
     */
    public get objectTypeId(): number {
        return this._objectTypeId;
    }

    /**
     * Gets the type the stream described by the current instance.
     */
    public get streamType(): number {
        return this._streamType;
    }

    /**
     * Gets the buffer size DB value the stream described by the current instance.
     */
    public get bufferSizeDB(): number {
        return this._bufferSizeDB;
    }

    /**
     *  Gets the maximum bitrate the stream described by the current instance.
     */
    public get maximumBitrate(): number {
        return this._max_bitrate / 1000;
    }

    /**
     * Gets the maximum average the stream described by the current instance.
     */
    public get averageBitrate(): number {
        return this._average_bitrate / 1000;
    }

    /**
     * Gets the decoder config data of stream described by the current instance.
     */
    public get decoderConfig(): ByteVector {
        return this._decoderConfig;
    }

    /**
     * Reads a section length and updates the offset to the end of of the length block.
     * @param data A @see ByteVector object to read from.
     * @param offset A value reference specifying the offset at which to read. This value gets updated to the
     * position following the size data.
     * @returns A value containing the length that was read.
     */
    public readLength(data: ByteVector, offset: number): number {
        let b: number = 0;
        const end: number = offset + 4;
        let length: number = 0;

        do {
            b = data.get(offset++);
            length = (<number>(length << 7)) | (<number>(b & 0x7f));
        } while ((b & 0x80) !== 0 && offset <= end); // The Length could be between 1 and 4 bytes for each descriptor

        return length;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see Mpeg4Box to provide an implementation of an Apple ItemListBox.
 */
export class AppleItemListBox extends Mpeg4Box {
    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see AppleItemListBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see AppleItemListBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): AppleItemListBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const appleItemListBox: AppleItemListBox = base as AppleItemListBox;

        appleItemListBox.children = appleItemListBox.loadChildren(file);

        return appleItemListBox;
    }

    /**
     * Constructs and initializes a new instance of @see AppleItemListBox with no children.
     * @returns A new instance of @see AppleItemListBox
     */
    public static fromEmpty(): AppleItemListBox {
        const base: Mpeg4Box = Mpeg4Box.fromType(ByteVector.fromString("ilst", StringType.UTF8));
        const appleItemListBox: AppleItemListBox = base as AppleItemListBox;

        appleItemListBox.children = [];

        return appleItemListBox;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class IsoSampleEntry extends Mpeg4Box {
    /**
     * The data reference index of the current instance.
     */
    private _dataReferenceIndex: number;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoSampleEntry with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoSampleEntry
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoSampleEntry {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        file.seek(base.dataPosition + 6);

        const isoSampleEntry: IsoSampleEntry = base as IsoSampleEntry;
        isoSampleEntry._dataReferenceIndex = file.readBlock(2).toUshort();

        return isoSampleEntry;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     * @return A value containing the position of the data contained in the current instance.
     */
    public get dataPosition(): number {
        return super.dataPosition + 8;
    }

    /**
     * Gets the data reference index of the current instance.
     * @return A value containing the data reference index of the current instance.
     */
    public get dataReferenceIndex(): number {
        return this._dataReferenceIndex;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see IsoSampleEntry and implements @see IAudioCodec to provide an implementation of a
 * ISO/IEC 14496-12 AudioSampleEntry and support for reading MPEG-4 video properties.
 */
export class IsoAudioSampleEntry extends IsoSampleEntry implements IAudioCodec {
    /**
     * Contains the channel count.
     */
    private _channel_count: number;

    /**
     * Contains the sample size.
     */
    private _sample_size: number;

    /**
     * Contains the sample rate.
     */
    private _sample_rate: number;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoVisualSampleEntry with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoVisualSampleEntry
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoAudioSampleEntry {
        Guards.notNullOrUndefined(file, "file");

        const base: IsoSampleEntry = IsoSampleEntry.fromHeaderFileAndHandler(header, file, handler);
        const isoAudioSampleEntry: IsoAudioSampleEntry = base as IsoAudioSampleEntry;

        file.seek(base.dataPosition + 8);
        isoAudioSampleEntry._channel_count = file.readBlock(2).toUshort();
        isoAudioSampleEntry._sample_size = file.readBlock(2).toUshort();
        file.seek(base.dataPosition + 16);
        isoAudioSampleEntry._sample_rate = file.readBlock(4).toUint();
        isoAudioSampleEntry.children = isoAudioSampleEntry.loadChildren(file);

        return isoAudioSampleEntry;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return super.dataPosition + 20;
    }

    /**
     * Gets the duration of the media represented by the current instance.
     */
    public get durationMilliseconds(): number {
        return 0;
    }

    /**
     *  Gets the types of media represented by the current instance.
     */
    public get mediaTypes(): MediaTypes {
        return MediaTypes.Audio;
    }

    /**
     *  Gets a text description of the media represented by the current instance.
     */
    public get description(): string {
        return `MPEG-4 Audio (${this.boxType})`;
    }

    /**
     * Gets the bitrate of the audio represented by the current instance.
     */
    public get audioBitrate(): number {
        const esds: Mpeg4Box = this.getChildRecursively(ByteVector.fromString("esds", StringType.UTF8));

        // If we don't have an stream descriptor, we don't know what's what.
        if (!(esds instanceof AppleElementaryStreamDescriptor)) {
            return 0;
        }

        // Return from the elementary stream descriptor.
        return esds.averageBitrate;
    }

    /**
     * Gets the sample rate of the audio represented by the current instance.
     */
    public get audioSampleRate(): number {
        return <number>(this._sample_rate >> 16);
    }

    /**
     * Gets the number of channels in the audio represented by the current instance.
     */
    public get audioChannels(): number {
        return this._channel_count;
    }

    /**
     *  Gets the sample size of the audio represented by the current instance.
     */
    public get audioSampleSize(): number {
        return this._sample_size;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 *  This class extends @see FullBox to provide an implementation of a ISO/IEC 14496-12 ChunkLargeOffsetBox.
 */
export class IsoChunkLargeOffsetBox extends FullBox {
    /**
     * The offset table contained in the current instance.
     */
    private _offsets: number[];

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoChunkLargeOffsetBox with a provided header
     * and handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoChunkLargeOffsetBox {
        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoAudioSampleEntry: IsoChunkLargeOffsetBox = base as IsoChunkLargeOffsetBox;

        const box_data: ByteVector = file.readBlock(isoAudioSampleEntry.dataSize);

        isoAudioSampleEntry._offsets = [box_data.subarray(0, 4).toUint()];

        for (let i = 0; i < isoAudioSampleEntry._offsets.length; i++) {
            isoAudioSampleEntry._offsets[i] = Number(box_data.subarray(4 + i * 8, 8).toUlong());
        }

        return isoAudioSampleEntry;
    }

    /**
     * Gets and sets the data contained in the current instance.
     */
    public get data(): ByteVector {
        const output: ByteVector = ByteVector.fromUint(this.offsets.length);
        for (let i = 0; i < this.offsets.length; i++) {
            output.addByteVector(ByteVector.fromUlong(this.offsets[i]));
        }

        return output;
    }

    /**
     * Gets the offset table contained in the current instance.
     */
    public get offsets(): number[] {
        return this._offsets;
    }

    /**
     * Overwrites the existing box in the file after updating the table for a size change.
     * @param file A @see File object containing the file to which the current instance belongs and wo which modifications
     * must be applied.
     * @param sizeDifference A value containing the size change that occurred in the file.
     * @param after A value containing the position in the file after which offsets will be invalidated. If an
     * offset is before this point, it won't be updated.
     */
    public overwrite(file: File, sizeDifference: number, after: number): void {
        Guards.notNullOrUndefined(file, "file");

        file.insert(this.renderUsingSizeDifference(sizeDifference, after), this.header.position, this.size);
    }

    /**
     * Renders the current instance after updating the table for a size change.
     * @param sizeDifference  A value containing the size change that occurred in the file.
     * @param after  A value containing the position in the file after which offsets will be invalidated. If an
     * offset is before this point, it won't be updated.
     */
    public renderUsingSizeDifference(sizeDifference: number, after: number): ByteVector {
        for (let i = 0; i < this.offsets.length; i++) {
            if (this.offsets[i] >= after) {
                this.offsets[i] = this.offsets[i] + sizeDifference;
            }
        }

        return this.render();
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of a ISO/IEC 14496-12 ChunkOffsetBox.
 */
export class IsoChunkOffsetBox extends FullBox {
    /**
     * The offset table contained in the current instance.
     */
    private _offsets: number[];

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoChunkOffsetBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoChunkOffsetBox {
        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoChunkOffsetBox: IsoChunkOffsetBox = base as IsoChunkOffsetBox;

        const box_data: ByteVector = file.readBlock(isoChunkOffsetBox.dataSize);

        isoChunkOffsetBox._offsets = [box_data.subarray(0, 4).toUint()];

        for (let i = 0; i < isoChunkOffsetBox._offsets.length; i++) {
            isoChunkOffsetBox._offsets[i] = box_data.subarray(4 + i * 4, 4).toUint();
        }

        return isoChunkOffsetBox;
    }

    /**
     * Gets and sets the data contained in the current instance.
     */
    public get data(): ByteVector {
        const output: ByteVector = ByteVector.fromUint(this.offsets.length);

        for (let i = 0; i < this.offsets.length; i++) {
            output.addByteVector(ByteVector.fromUint(this.offsets[i]));
        }

        return output;
    }

    /**
     * Gets the offset table contained in the current instance.
     */
    public get offsets(): number[] {
        return this._offsets;
    }

    /**
     * Overwrites the existing box in the file after updating the table for a size change.
     * @param file A @see File object containing the file to which the current instance belongs and wo which modifications
     * must be applied.
     * @param sizeDifference A value containing the size change that occurred in the file.
     * @param after A value containing the position in the file after which offsets will be invalidated. If an
     * offset is before this point, it won't be updated.
     */
    public overwrite(file: File, sizeDifference: number, after: number): void {
        Guards.notNullOrUndefined(file, "file");

        file.insert(this.renderUsingSizeDifference(sizeDifference, after), this.header.position, this.size);
    }

    /**
     * Renders the current instance after updating the table for a size change.
     * @param sizeDifference  A value containing the size change that occurred in the file.
     * @param after  A value containing the position in the file after which offsets will be invalidated. If an
     * offset is before this point, it won't be updated.
     */
    public renderUsingSizeDifference(sizeDifference: number, after: number): ByteVector {
        for (let i = 0; i < this.offsets.length; i++) {
            if (this.offsets[i] >= after) {
                this.offsets[i] = this.offsets[i] + Number(sizeDifference);
            }
        }

        return this.render();
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 *  This class extends @see Mpeg4Box to provide an implementation of a ISO/IEC 14496-12 FreeSpaceBox.
 */
export class IsoFreeSpaceBox extends Mpeg4Box {
    /**
     * Contains the size of the padding.
     */
    private _padding: number;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoFreeSpaceBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file  A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoFreeSpaceBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoFreeSpaceBox {
        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const isoFreeSpaceBox: IsoFreeSpaceBox = base as IsoFreeSpaceBox;
        isoFreeSpaceBox._padding = isoFreeSpaceBox.dataSize;

        return isoFreeSpaceBox;
    }

    /**
     * Constructs and initializes a new instance of @see IsoFreeSpaceBox to occupy a specified number of bytes.
     * @param padding  A value specifying the number of bytes the new instance should occupy when rendered.
     * @returns A new instance of @see IsoFreeSpaceBox
     */
    public static fromPadding(padding: number): IsoFreeSpaceBox {
        const base: Mpeg4Box = Mpeg4Box.fromType(ByteVector.fromString("free", StringType.UTF8));
        const isoFreeSpaceBox: IsoFreeSpaceBox = base as IsoFreeSpaceBox;
        isoFreeSpaceBox.paddingSize = isoFreeSpaceBox._padding;

        return isoFreeSpaceBox;
    }

    /**
     * Gets and sets the data contained in the current instance.
     * @returns A @see ByteVector object containing the data contained in the current instance.
     */
    public get data(): ByteVector {
        return ByteVector.fromInt(this._padding);
    }
    public set data(v: ByteVector) {
        this._padding = v !== null && v !== undefined ? v.length : 0;
    }

    /**
     * Gets and sets the size the current instance will occupy when rendered.
     * @returns A value containing the size the current instance will occupy when rendered.
     */
    public get paddingSize(): number {
        return this._padding + 8;
    }
    public set paddingSize(v: number) {
        this._padding = v - 8;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of a ISO/IEC 14496-12 FullBox.
 */
export class IsoHandlerBox extends FullBox {
    /**
     * The handler type of the current instance.
     */
    private _handlerType: ByteVector;

    /**
     * The name of the current instance.
     */
    private _name: string;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoHandlerBox with a provided header and h
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoHandlerBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoHandlerBox {
        Guards.notNullOrUndefined(file, "file");

        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoHandlerBox: IsoHandlerBox = base as IsoHandlerBox;

        file.seek(isoHandlerBox.dataPosition + 4);
        const box_data: ByteVector = file.readBlock(isoHandlerBox.dataSize - 4);
        isoHandlerBox._handlerType = box_data.subarray(0, 4);

        let end: number = box_data.find(ByteVector.fromInt(0), 16);

        if (end < 16) {
            end = box_data.length;
        }

        isoHandlerBox._name = end > 16 ? box_data.subarray(16, end - 16).toString(StringType.UTF8) : "";

        return isoHandlerBox;
    }

    /**
     * Constructs and initializes a new instance of @see IsoHandlerBox with a specified type and name.
     * @param handlerType A @see ByteVector object specifying a 4 byte handler type.
     * @param name An object specifying the handler name.
     * @returns A new instance of @see IsoHandlerBox
     */
    public static fromHandlerTypeAndHandlerName(handlerType: ByteVector, name: string): IsoHandlerBox {
        Guards.notNullOrUndefined(handlerType, "handlerType");

        if (handlerType.length < 4) {
            throw new Error("The handler type must be four bytes long.");
        }

        const base: FullBox = FullBox.fromTypeVersionAndFlags(ByteVector.fromString("hdlr", StringType.UTF8), 0, 0);
        const isoHandlerBox: IsoHandlerBox = base as IsoHandlerBox;

        isoHandlerBox._handlerType = handlerType.subarray(0, 4);
        isoHandlerBox._name = name;

        return isoHandlerBox;
    }

    /**
     * Gets the data contained in the current instance.
     */
    public get data(): ByteVector {
        // TODO: not sure if this is correct. I don't understand the syntax in the original code.
        const output: ByteVector = ByteVector.concatenate(
            this.handlerType,
            ByteVector.fromInt(12),
            ByteVector.fromString(this.name, StringType.UTF8),
            ByteVector.fromInt(2)
        );

        return output;
    }

    /**
     * Gets the handler type of the current instance.
     * @returns A @see ByteVector object containing the handler type of the current instance.
     */
    public get handlerType(): ByteVector {
        return this._handlerType;
    }

    /**
     * Gets the name of the current instance.
     */
    public get name(): string {
        return this._name;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Constructs and initializes a new instance of @see IsoMetaBox with a provided header and
 * handler by reading the contents from a specified file.
 */
export class IsoMetaBox extends FullBox {
    /**
     * Constructs and initializes a new instance of @see IsoMetaBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoMetaBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoMetaBox {
        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoMetaBox: IsoMetaBox = base as IsoMetaBox;
        isoMetaBox.children = isoMetaBox.loadChildren(file);

        return isoMetaBox;
    }

    /**
     * Constructs and initializes a new instance of @see IsoMetaBox with a specified handler.
     * @param handlerType A @see ByteVector object specifying a 4 byte handler type.
     * @param handlerName A @see string object specifying the handler name.
     * @returns A new instance of @see IsoMetaBox
     */
    public static fromHandlerTypeAndHandlerName(handlerType: ByteVector, handlerName: string): IsoMetaBox {
        Guards.notNullOrUndefined(handlerType, "handlerType");

        if (handlerType.length < 4) {
            throw new Error("The handler type must be four bytes long.");
        }

        const base: FullBox = FullBox.fromTypeVersionAndFlags(ByteVector.fromString("meta", StringType.UTF8), 0, 0);
        const isoMetaBox: IsoMetaBox = base as IsoMetaBox;

        isoMetaBox.children = [];
        isoMetaBox.addChild(IsoHandlerBox.fromHandlerTypeAndHandlerName(handlerType, handlerName));

        return isoMetaBox;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of a ISO/IEC 14496-12 MovieHeaderBox.
 */
export class IsoMovieHeaderBox extends FullBox {
    /**
     * The ID of the next track in the movie represented by the current instance.
     */
    private _nextTrackId: number;

    /**
     * Contains the creation time of the movie.
     */
    private _creation_time: number;

    /**
     * Contains the modification time of the movie.
     */
    private _modification_time: number;

    /**
     * Contains the timescale.
     */
    private _timescale: number;

    /**
     * Contains the duration.
     */
    private _duration: number;

    /**
     * Contains the rate.
     */
    private _rate: number;

    /**
     * Contains the volume.
     */
    private _volume: number;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoMovieHeaderBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoMovieHeaderBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoMovieHeaderBox {
        Guards.notNullOrUndefined(file, "file");

        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoMovieHeaderBox: IsoMovieHeaderBox = base as IsoMovieHeaderBox;

        let bytes_remaining: number = isoMovieHeaderBox.dataSize;
        let data: ByteVector;

        if (isoMovieHeaderBox.version === 1) {
            // Read version one (large integers).
            data = file.readBlock(Math.min(28, bytes_remaining));

            if (data.length >= 8) {
                isoMovieHeaderBox._creation_time = Number(data.subarray(0, 8).toUlong());
            }

            if (data.length >= 16) {
                isoMovieHeaderBox._modification_time = Number(data.subarray(8, 8).toUlong());
            }

            if (data.length >= 20) {
                isoMovieHeaderBox._timescale = data.subarray(16, 4).toUint();
            }

            if (data.length >= 28) {
                isoMovieHeaderBox._duration = Number(data.subarray(20, 8).toUlong());
            }

            bytes_remaining -= 28;
        } else {
            // Read version zero (normal integers).
            data = file.readBlock(Math.min(16, bytes_remaining));

            if (data.length >= 4) {
                isoMovieHeaderBox._creation_time = data.subarray(0, 4).toUint();
            }

            if (data.length >= 8) {
                isoMovieHeaderBox._modification_time = data.subarray(4, 4).toUint();
            }

            if (data.length >= 12) {
                isoMovieHeaderBox._timescale = data.subarray(8, 4).toUint();
            }

            if (data.length >= 16) {
                isoMovieHeaderBox._duration = data.subarray(12, 4).toUint();
            }

            bytes_remaining -= 16;
        }

        data = file.readBlock(Math.min(6, bytes_remaining));

        if (data.length >= 4) {
            isoMovieHeaderBox._rate = data.subarray(0, 4).toUint();
        }

        if (data.length >= 6) {
            isoMovieHeaderBox._volume = data.subarray(4, 2).toUshort();
        }

        file.seek(file.tell + 70);
        bytes_remaining -= 76;

        data = file.readBlock(Math.min(4, bytes_remaining));

        if (data.length >= 4) {
            isoMovieHeaderBox._nextTrackId = data.subarray(0, 4).toUint();
        }

        return isoMovieHeaderBox;
    }

    // TODO: properties CreationTime and ModificationTime are not yet implemented. There were no references to them in the original code.

    /**
     * Gets the duration of the movie represented by the current instance.
     */
    public get durationInMilliseconds(): number {
        // The length is the number of ticks divided by ticks per second.
        // TODO: not sure about conversion to Number here
        return (this._duration / this._timescale) * 1000;
    }

    /**
     *  Gets the playback rate of the movie represented by the current instance.
     */
    public get rate(): number {
        return this._rate / 0x10000;
    }

    /**
     *  Gets the playback volume of the movie represented by the current instance.
     */
    public get volume(): number {
        return this._volume / 0x100;
    }

    /**
     * Gets the ID of the next track in the movie represented by the current instance.
     */
    public get nextTrackId(): number {
        return this._nextTrackId;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see FullBox to provide an implementation of a ISO/IEC 14496-12 SampleDescriptionBox.
 */
export class IsoSampleDescriptionBox extends FullBox {
    /**
     * The number of boxes at the beginning of the children that will be stored as @see IsoAudioSampleEntry
     * of @see IsoVisualSampleEntry" objects, depending on the handler.
     */
    private _entryCount: number;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoSampleDescriptionBox with a provided header
     * and handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoSampleDescriptionBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoSampleDescriptionBox {
        Guards.notNullOrUndefined(file, "file");

        const base: FullBox = FullBox.fromHeaderFileAndHandler(header, file, handler);
        const isoSampleDescriptionBox: IsoSampleDescriptionBox = base as IsoSampleDescriptionBox;

        isoSampleDescriptionBox._entryCount = file.readBlock(4).toUint();
        isoSampleDescriptionBox.children = isoSampleDescriptionBox.loadChildren(file);

        return isoSampleDescriptionBox;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return super.dataPosition + 4;
    }

    /**
     * Gets the number of boxes at the beginning of the children that will be stored as @see IsoAudioSampleEntry
     * of @see IsoVisualSampleEntry" objects, depending on the handler.
     */
    public get entryCount(): number {
        return this._entryCount;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see Mpeg4Box to provide an implementation of a ISO/IEC 14496-12 SampleTableBox.
 */
export class IsoSampleTableBox extends Mpeg4Box {
    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoSampleTableBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoSampleTableBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoSampleTableBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const isoSampleTableBox: IsoSampleTableBox = base as IsoSampleTableBox;

        isoSampleTableBox.children = isoSampleTableBox.loadChildren(file);

        return isoSampleTableBox;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see Mpeg4Box to provide an implementation of a ISO/IEC 14496-12 UserDataBox.
 */
export class IsoUserDataBox extends Mpeg4Box {
    /**
     *  Gets the box headers for the current "udta" box and all parent boxes up to the top of the file.
     */
    public parentTree: Mpeg4BoxHeader[];

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see IsoUserDataBox with a provided header and
     * handler by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @seeIsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see IsoUserDataBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoUserDataBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const isoUserDataBox: IsoUserDataBox = base as IsoUserDataBox;

        isoUserDataBox.children = isoUserDataBox.loadChildren(file);

        return isoUserDataBox;
    }

    /**
     * Constructs and initializes a new instance of @see IsoUserDataBox with no children.
     * @returns A new instance of @see IsoUserDataBox
     */
    public static fromEmpty(): IsoUserDataBox {
        const base: Mpeg4Box = Mpeg4Box.fromType(ByteVector.fromString("udta", StringType.UTF8));
        const isoUserDataBox: IsoUserDataBox = base as IsoUserDataBox;

        isoUserDataBox.children = [];

        return isoUserDataBox;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * This class extends @see IsoSampleEntry and implements @see IVideoCodec to provide an implementation of a
 * ISO/IEC 14496-12 VisualSampleEntry and support for reading MPEG-4 video properties.
 */
export class IsoVisualSampleEntry extends IsoSampleEntry implements IVideoCodec {
    /**
     * Contains the width of the visual.
     */
    private _width: number;

    /**
     * Contains the height of the visual.
     */
    private _height: number;

    public constructor() {
        super();
    }

    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): IsoVisualSampleEntry {
        Guards.notNullOrUndefined(file, "file");

        const base: IsoSampleEntry = IsoSampleEntry.fromHeaderFileAndHandler(header, file, handler);
        const isoVisualSampleEntry: IsoVisualSampleEntry = base as IsoVisualSampleEntry;

        file.seek(base.dataPosition + 16);
        isoVisualSampleEntry._width = file.readBlock(2).toUshort();
        isoVisualSampleEntry._height = file.readBlock(2).toUshort();

        /*
		TODO: What are the children anyway?
		children = LoadChildren (file);
		*/

        return isoVisualSampleEntry;
    }

    /**
     * Gets the position of the data contained in the current instance, after any box specific headers.
     */
    public get dataPosition(): number {
        return super.dataPosition + 62;
    }

    /**
     * Gets the duration of the media represented by the current instance.
     */
    public get durationMilliseconds(): number {
        return 0;
    }

    /**
     * Gets the types of media represented by the current instance.
     */
    public get mediaTypes(): MediaTypes {
        return MediaTypes.Video;
    }

    /**
     * Gets a text description of the media represented by the current instance.
     */
    public get description(): string {
        return `MPEG-4 Video (${this.boxType})`;
    }

    /**
     * Gets the width of the video represented by the current instance.
     */
    public get videoWidth(): number {
        return this._width;
    }

    /**
     * Gets the height of the video represented by the current instance.
     */
    public get videoHeight(): number {
        return this._height;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Represents an MP4 text box
 */
export class TextBox extends Mpeg4Box {
    /**
     * Contains the box's data.
     */
    private _data: ByteVector;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see TextBox with a provided header and handler
     * by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see TextBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): TextBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const textBox: TextBox = base as TextBox;

        textBox._data = textBox.loadData(file);

        return textBox;
    }

    /**
     * Gets and sets the box data contained in the current instance.
     */
    public get data(): ByteVector {
        return this._data;
    }

    public set data(v: ByteVector) {
        this._data = v;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class UnknownBox extends Mpeg4Box {
    /**
     * Contains the box's data.
     */
    private _data: ByteVector;

    public constructor() {
        super();
    }

    /**
     * Constructs and initializes a new instance of @see UnknownBox with a provided header and handler
     * by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see UnknownBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): UnknownBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const unknownBox: UnknownBox = base as UnknownBox;

        unknownBox._data = file.readBlock(unknownBox.dataSize > 0 ? unknownBox.dataSize : 0);

        return unknownBox;
    }

    /**
     * Gets and sets the box data contained in the current instance.
     */
    public get data(): ByteVector {
        return this._data;
    }

    public set data(v: ByteVector) {
        this._data = v;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class UrlBox extends Mpeg4Box {
    /**
     * Contains the box's data.
     */
    private _data: ByteVector;

    public constructor() {
        super();
    }

    /**
     *  Constructs and initializes a new instance of @see UrlBox with a provided header and handler
     * by reading the contents from a specified file.
     * @param header A @see Mpeg4BoxHeader object containing the header to use for the new instance.
     * @param file A @see File object to read the contents of the box from.
     * @param handler A @see IsoHandlerBox object containing the handler that applies to the new instance.
     * @returns A new instance of @see UrlBox
     */
    public static fromHeaderFileAndHandler(header: Mpeg4BoxHeader, file: File, handler: IsoHandlerBox): UrlBox {
        Guards.notNullOrUndefined(file, "file");

        const base: Mpeg4Box = Mpeg4Box.fromHeaderAndHandler(header, handler);
        const urlBox: UrlBox = base as UrlBox;

        urlBox._data = urlBox.loadData(file);

        return urlBox;
    }

    /**
     * Gets and sets the box data contained in the current instance.
     */
    public get data(): ByteVector {
        return this._data;
    }

    public set data(v: ByteVector) {
        this._data = v;
    }
}

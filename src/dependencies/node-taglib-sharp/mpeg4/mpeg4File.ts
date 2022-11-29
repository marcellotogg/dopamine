import { File, FileAccessMode, ReadStyle } from "../file";
import { IFileAbstraction } from "../fileAbstraction";
import { Properties } from "../properties";
import { Tag, TagTypes } from "../tag";
import { NumberUtils } from "../utils";
import AppleTag from "./appleTag";
import { IsoAudioSampleEntry, IsoMovieHeaderBox, IsoUserDataBox, IsoVisualSampleEntry } from "./mpeg4Boxes";
import Mpeg4BoxType from "./mpeg4BoxType";
import Mpeg4FileParser from "./mpeg4FileParser";
import Mpeg4Tag from "./mpeg4Tag";

/**
 * Provides tagging and properties support for Mpeg4 files.
 */
export default class Mpeg4File extends File {
    /**
     * Contains the Apple tag.
     */
    private _appleTag: AppleTag;

    /**
     * Contains the combined tag.
     */
    private _tag: Mpeg4Tag;

    /**
     * Contains the media properties.
     */
    private _properties: Properties;

    /**
     * Contains the UDTA Boxes
     */
    private readonly _udtaBoxes: IsoUserDataBox[] = [];

    /**
     * The position at which the invariant portion of the current instance begins.
     */
    private _invariantStartPosition: number = -1;

    /**
     * The position at which the invariant portion of the current instance ends.
     */
    private _invariantEndPosition: number = -1;

    /** @inheritDoc */
    public constructor(file: IFileAbstraction | string, readStyle: ReadStyle) {
        super(file);

        this.read(readStyle);
    }

    private read(readStyle: ReadStyle): void {
        this._tag = new Mpeg4Tag();
        this.mode = FileAccessMode.Read;

        try {
            // Read the file
            const parser = new Mpeg4FileParser(this);

            if ((readStyle & ReadStyle.Average) === 0) {
                parser.parseTag();
            } else {
                parser.parseTagAndProperties();
            }

            this._invariantStartPosition = parser.mdatStartPosition;
            this._invariantEndPosition = parser.mdatEndPosition;

            this._udtaBoxes.push(...parser.userDataBoxes);

            // Ensure our collection contains at least a single empty box
            if (this._udtaBoxes.length === 0) {
                const dummy = IsoUserDataBox.fromEmpty();
                this._udtaBoxes.push(dummy);
            }

            // Check if a udta with ILST actually exists
            if (this.isAppleTagUdtaPresent()) {
                // There is an udta present with ILST info
                this.tagTypesOnDisk = NumberUtils.uintOr(this.tagTypesOnDisk, TagTypes.Apple);
            }

            // Find the udta box with the Apple Tag ILST
            let udtaBox: IsoUserDataBox = this.findAppleTagUdta();
            if (udtaBox === null || udtaBox === undefined) {
                udtaBox = IsoUserDataBox.fromEmpty();
            }

            this._appleTag = new AppleTag(udtaBox);
            this._tag.addTag(this._appleTag);

            // If we're not reading properties, we're done.
            // TODO: was this check converted correctly?
            if (readStyle === ReadStyle.Average) {
                this.mode = FileAccessMode.Closed;

                return;
            }

            // Get the movie header box.
            const mvhd_box: IsoMovieHeaderBox = parser.movieHeaderBox;

            if (mvhd_box === null || mvhd_box === undefined) {
                this.mode = FileAccessMode.Closed;
                throw new Error("mvhd box not found.");
            }

            const audio_sample_entry: IsoAudioSampleEntry = parser.audioSampleEntry;
            const visual_sample_entry: IsoVisualSampleEntry = parser.visualSampleEntry;

            // Read the properties.
            // TODO: is this usage of the Properties constructor correct?
            this._properties = new Properties(mvhd_box.durationInMilliseconds, [audio_sample_entry, visual_sample_entry]);

            // TODO
        } finally {
            this.mode = FileAccessMode.Closed;
        }
    }

    /** @inheritDoc */
    public get tag(): Tag {
        return this._tag;
    }

    /** @inheritDoc */
    public get properties(): Properties {
        return this._properties;
    }

    protected get udtaBoxes(): IsoUserDataBox[] {
        return this._udtaBoxes;
    }

    /** @inheritDoc */
    public getTag(types: TagTypes, create: boolean): Tag {
        // TODO
        return undefined;
    }

    /** @inheritDoc */
    public removeTags(types: TagTypes): void {
        // TODO
    }

    /** @inheritDoc */
    public save(): void {
        // TODO
    }

    /**
     * Gets the position at which the invariant portion of the current instance begins.
     */
    public get invariantStartPosition(): number {
        return this._invariantStartPosition;
    }

    public get invariantEndPosition(): number {
        return this._invariantEndPosition;
    }

    /**
     * Find the udta box within our collection that contains the Apple ILST data.
     * @returns The udta box within our collection that contains the Apple ILST data.
     */
    private findAppleTagUdta(): IsoUserDataBox {
        if (this.udtaBoxes.length === 1) {
            return this.udtaBoxes[0]; // Single udta - just return it
        }

        // multiple udta : pick out the shallowest node which has an ILst tag
        // TODO: getChildRecursively should only return undefined and not null. Is this undefined check sufficient?
        const possibleUdtaBoxes: IsoUserDataBox[] = this.udtaBoxes
            .filter((box) => box.getChildRecursively(Mpeg4BoxType.Ilst) !== undefined)
            .sort((box1, box2) => (box1.parentTree.length < box2.parentTree.length ? -1 : 1));

        if (possibleUdtaBoxes.length > 0) {
            return possibleUdtaBoxes[0];
        }

        return undefined;
    }

    /**
     * Gets if there is a udta with ILST present in our collection
     * @returns True if there is a udta with ILST present in our collection
     */
    private isAppleTagUdtaPresent(): boolean {
        for (const udtaBox of this._udtaBoxes) {
            if (
                udtaBox.getChild(Mpeg4BoxType.Meta) !== null &&
                udtaBox.getChild(Mpeg4BoxType.Meta) !== undefined &&
                udtaBox.getChild(Mpeg4BoxType.Meta).getChild(Mpeg4BoxType.Ilst) !== null &&
                udtaBox.getChild(Mpeg4BoxType.Meta).getChild(Mpeg4BoxType.Ilst) !== undefined
            ) {
                return true;
            }
        }
        return false;
    }
}

// /////////////////////////////////////////////////////////////////////////
// Register the file type
["taglib/m4a"].forEach((mt) => File.addFileType(mt, Mpeg4File));

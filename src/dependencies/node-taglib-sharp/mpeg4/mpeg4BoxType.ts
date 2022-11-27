import { ByteVector, StringType } from "../byteVector";
import Mpeg4Utils from "./mpeg4Utils";

/**
 * Provides references to different box types used by the library. This class is used to severely reduce the number
 * of times these types are created in @see AppleTag, greatly improving the speed at which warm files are read.
 */
export default class Mpeg4BoxType {
    public static readonly Aart = ByteVector.fromString("aART", StringType.UTF8).makeReadOnly();
    public static readonly Alb = Mpeg4Utils.fixId(ByteVector.fromString("alb", StringType.UTF8)).makeReadOnly();
    public static readonly Art = Mpeg4Utils.fixId(ByteVector.fromString("ART", StringType.UTF8)).makeReadOnly();
    public static readonly Cmt = Mpeg4Utils.fixId(ByteVector.fromString("cmt", StringType.UTF8)).makeReadOnly();
    public static readonly Cond = ByteVector.fromString("cond", StringType.UTF8).makeReadOnly();
    public static readonly Covr = ByteVector.fromString("covr", StringType.UTF8).makeReadOnly();
    public static readonly Co64 = ByteVector.fromString("co64", StringType.UTF8).makeReadOnly();
    public static readonly Cpil = ByteVector.fromString("cpil", StringType.UTF8).makeReadOnly();
    public static readonly Cprt = ByteVector.fromString("cprt", StringType.UTF8).makeReadOnly();
    public static readonly Data = ByteVector.fromString("data", StringType.UTF8).makeReadOnly();
    public static readonly Day = Mpeg4Utils.fixId(ByteVector.fromString("day", StringType.UTF8)).makeReadOnly();
    public static readonly Desc = ByteVector.fromString("desc", StringType.UTF8).makeReadOnly();
    public static readonly Disk = ByteVector.fromString("disk", StringType.UTF8).makeReadOnly();
    public static readonly Dtag = ByteVector.fromString("dtag", StringType.UTF8).makeReadOnly();
    public static readonly Esds = ByteVector.fromString("esds", StringType.UTF8).makeReadOnly();
    public static readonly Ilst = ByteVector.fromString("ilst", StringType.UTF8).makeReadOnly();
    public static readonly Free = ByteVector.fromString("free", StringType.UTF8).makeReadOnly();
    public static readonly Gen = Mpeg4Utils.fixId(ByteVector.fromString("gen", StringType.UTF8)).makeReadOnly();
    public static readonly Gnre = ByteVector.fromString("gnre", StringType.UTF8).makeReadOnly();
    public static readonly Grp = Mpeg4Utils.fixId(ByteVector.fromString("grp", StringType.UTF8)).makeReadOnly();
    public static readonly Hdlr = ByteVector.fromString("hdlr", StringType.UTF8).makeReadOnly();
    public static readonly Lyr = Mpeg4Utils.fixId(ByteVector.fromString("lyr", StringType.UTF8)).makeReadOnly();
    public static readonly Mdat = ByteVector.fromString("mdat", StringType.UTF8).makeReadOnly();
    public static readonly Mdia = ByteVector.fromString("mdia", StringType.UTF8).makeReadOnly();
    public static readonly Meta = ByteVector.fromString("meta", StringType.UTF8).makeReadOnly();
    public static readonly Mean = ByteVector.fromString("mean", StringType.UTF8).makeReadOnly();
    public static readonly Minf = ByteVector.fromString("minf", StringType.UTF8).makeReadOnly();
    public static readonly Moov = ByteVector.fromString("moov", StringType.UTF8).makeReadOnly();
    public static readonly Mvhd = ByteVector.fromString("mvhd", StringType.UTF8).makeReadOnly();
    public static readonly Nam = Mpeg4Utils.fixId(ByteVector.fromString("nam", StringType.UTF8)).makeReadOnly();
    public static readonly Name = ByteVector.fromString("name", StringType.UTF8).makeReadOnly(); // "theName" because "name" is reserved
    public static readonly Role = ByteVector.fromString("role", StringType.UTF8).makeReadOnly();
    public static readonly Skip = ByteVector.fromString("skip", StringType.UTF8).makeReadOnly();
    public static readonly Soaa = ByteVector.fromString("soaa", StringType.UTF8).makeReadOnly(); // Album Artist Sort
    public static readonly Soar = ByteVector.fromString("soar", StringType.UTF8).makeReadOnly(); // Performer Sort
    public static readonly Soco = ByteVector.fromString("soco", StringType.UTF8).makeReadOnly(); // Composer Sort
    public static readonly Sonm = ByteVector.fromString("sonm", StringType.UTF8).makeReadOnly(); // Track Title Sort
    public static readonly Soal = ByteVector.fromString("soal", StringType.UTF8).makeReadOnly(); // Album Title Sort
    public static readonly Stbl = ByteVector.fromString("stbl", StringType.UTF8).makeReadOnly();
    public static readonly Stco = ByteVector.fromString("stco", StringType.UTF8).makeReadOnly();
    public static readonly Stsd = ByteVector.fromString("stsd", StringType.UTF8).makeReadOnly();
    public static readonly Subt = ByteVector.fromString("Subt", StringType.UTF8).makeReadOnly();
    public static readonly Text = ByteVector.fromString("text", StringType.UTF8).makeReadOnly();
    public static readonly Tmpo = ByteVector.fromString("tmpo", StringType.UTF8).makeReadOnly();
    public static readonly Trak = ByteVector.fromString("trak", StringType.UTF8).makeReadOnly();
    public static readonly Trkn = ByteVector.fromString("trkn", StringType.UTF8).makeReadOnly();
    public static readonly Udta = ByteVector.fromString("udta", StringType.UTF8).makeReadOnly();
    public static readonly Url = Mpeg4Utils.fixId(ByteVector.fromString("url", StringType.UTF8)).makeReadOnly();
    public static readonly Uuid = ByteVector.fromString("uuid", StringType.UTF8).makeReadOnly();
    public static readonly Wrt = Mpeg4Utils.fixId(ByteVector.fromString("wrt", StringType.UTF8)).makeReadOnly();
    public static readonly DASH = ByteVector.fromString("----", StringType.UTF8).makeReadOnly();

    // Handler types.
    public static readonly Soun = ByteVector.fromString("soun", StringType.UTF8).makeReadOnly();
    public static readonly Vide = ByteVector.fromString("vide", StringType.UTF8).makeReadOnly();

    // Another handler type, found in wild in audio file ripped using iTunes.
    public static readonly Alis = ByteVector.fromString("alis", StringType.UTF8).makeReadOnly();
}

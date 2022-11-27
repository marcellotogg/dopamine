import { ByteVector } from "../byteVector";

export default class Mpeg4Utils {
    /**
     * Converts the provided ID into a readonly ID and fixes a 3 byte ID.
     * @param id A <see cref="ByteVector" /> object containing an ID to fix.
     * @returns A fixed @see ByteVector or undefined if the ID could not be fixed.
     */
    public static fixId(id: ByteVector): ByteVector {
        if (id.length === 4) {
            return id;
        }

        if (id.length === 3) {
            return ByteVector.fromByteArray([0xa9, id.get(0), id.get(1), id.get(2)]);
        }

        return undefined;
    }
}

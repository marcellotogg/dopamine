import { File } from "../../../dependencies/node-taglib-sharp";

describe("mpeg4", () => {
    describe("constructor", () => {
        it("should read from a file", () => {
            const tagLibFile = File.createFromPath("/home/raphael/Downloads/m4a/01. Main Title Theme - Westworld.m4a");
            const album: string = tagLibFile.tag.album;
            const title: string = tagLibFile.tag.title;
        });

        it("should write to a file", () => {
            let tagLibFile = File.createFromPath("/home/raphael/Downloads/m4a/01. Main Title Theme - Westworld.m4a");
            const albumBefore: string = tagLibFile.tag.album;
            tagLibFile.tag.album = "test";
            tagLibFile.save();

            tagLibFile = File.createFromPath("/home/raphael/Downloads/m4a/01. Main Title Theme - Westworld.m4a");
            const albumAfter: string = tagLibFile.tag.album;
        });
    });
});

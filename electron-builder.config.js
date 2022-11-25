
const config = {
    appId: "com.digimezzo.dopamine",
    productName: "Dopamine",
    fileAssociations: [
        {
            name: "MP3 Files",
            description: "MP3 Files",
            ext: "mp3",
            icon: "build/mp3"
        },
        {
            name: "FLAC Files",
            description: "FLAC Files",
            ext: "flac",
            icon: "build/flac"
        },
        {
            name: "OGG Files",
            description: "OGG Files",
            ext: "ogg",
            icon: "build/ogg"
        },
        {
            name: "M4A Files",
            description: "M4A Files",
            ext: "m4a",
            icon: "build/m4a"
        },
        {
            name: "OPUS Files",
            description: "OPUS Files",
            ext: "opus",
            icon: "build/opus"
        },
        {
            name: "WAV Files",
            description: "WAV Files",
            ext: "wav",
            icon: "build/wav"
        }
    ],
    nsis: {
        shortcutName: "Dopamine 3",
        perMachine: true
    },
    directories: {
        output: "release"
    },
    files: ["**/*"],
    extraResources: ["LICENSE"],
    win: {
        target: ["nsis"],
        artifactName: "${productName}-${version}.${ext}"
    },
    mac: {
        target: ["dmg"],
        artifactName: "${productName}-${version}.${ext}"
    },
    linux: {
        target: ["AppImage", "deb", "rpm", "pacman", "snap"],
        category: "Audio",
        artifactName: "${productName}-${version}.${ext}",
        desktop: {
            Name: "Dopamine 3",
            Terminal: "false"
        }
    }
};

module.exports = config;

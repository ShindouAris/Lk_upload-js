const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { logInfo, logError } = require("../logger.service.js");
const { createFolderIfNotExist } = require("../../helpers/utils.js");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const unlinkFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            logError("unlinkFile", err);
        }
    });
};

const encodeVideoToMp4 = (inputPath) => {
    return new Promise((resolve, reject) => {
        const outputPath = inputPath.replace(/\.webm$/, ".mp4");

        ffmpeg(inputPath)
            .outputOptions([
                "-c copy",
                "-movflags +faststart"
            ])
            .on("end", () => {
                try {
                    unlinkFile(inputPath);
                }
                catch (err) {
                    logError("unlinkFile", err);
                }
                resolve(outputPath);
            })
            .on("error", (err) => {
                reject(err);
            })
            .save(outputPath);
    });
};

// TESING COMPRESS VIDEO

const compressVideo = async (inputPath, outputPath) => {
    logInfo("compressVideo", "Compressing video...");
    const videoSize = fs.statSync(inputPath).size;
    logInfo("compressVideo", `Video size: ${videoSize / 1024 / 1024} MB`);
    
    if (videoSize < 10 * 1024 * 1024) {
        logInfo("compressVideo", "Video đã nhỏ hơn 10MB, không cần nén");
        return inputPath;
    }
    try {
        ffmpeg(inputPath)
    .videoCodec('libx264')
    .outputOptions([
        '-crf 28',
        '-preset veryfast' 
    ])
    .on('start', cmd => console.log('Started:', cmd))
    .on('progress', progress => {
        logInfo("compressVideo", `Processing: ${progress.percent.toFixed(2)}%`);
    })
    .on('end', () => {
        logInfo("compressVideo", "Finished encoding");
        unlinkFile(inputPath);
    })
    .on('error', err => console.error('Error:', err))
    .save(outputPath);

    return outputPath;
    } catch (error) {
        logError("compressVideo", error);
        return inputPath; // Something went wrong, return the original video path
    }
}

const thumbnailData = async (
    videoPath,
    imageFormat = "jpeg",
    maxWidth = 640,
    quality = 75
) => {
    return new Promise((resolve, reject) => {
        try {
            createFolderIfNotExist(path.join(__dirname, "thumbnails"));
            const tempFilePath = path.join(
                __dirname,
                "thumbnails",
                `thumbnail_${Date.now()}.${imageFormat}`
            );

            ffmpeg(videoPath)
                .on("end", () => {
                    fs.readFile(tempFilePath, (err, data) => {
                        if (err) {
                            logError("thumbnailData", err);
                            reject(err);
                        }

                        // Xoá file tạm sau khi đọc xong
                        unlinkFile(tempFilePath);

                        logInfo(
                            "thumbnailData",
                            "Thumbnail created successfully"
                        );
                        resolve(data);
                    });
                })
                .on("error", (err) => {
                    reject(err);
                    logInfo("thumbnailData", err);
                })
                .screenshots({
                    timestamps: ["50%"],
                    filename: path.basename(tempFilePath),
                    folder: path.join(__dirname, "thumbnails"),
                    size: `${maxWidth}x?`,
                    quality: quality,
                });
        } catch (e) {
            logError("thumbnailData", e);
            reject(e);
        }
    });
};

module.exports = {
    thumbnailData,
    encodeVideoToMp4,
    compressVideo
};

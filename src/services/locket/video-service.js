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
};

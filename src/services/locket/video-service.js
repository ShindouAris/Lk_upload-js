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

const compressVideo = async (inputPath, outputPath) => {
    logInfo("compressVideo", "Compressing video...");
    const videoSize = fs.statSync(inputPath).size;
    logInfo("compressVideo", `Video size: ${videoSize / 1024 / 1024} MB`);
    
    if (videoSize < 10 * 1024 * 1024) {
        logInfo("compressVideo", "Video đã nhỏ hơn 10MB, không cần nén");
        return inputPath;
    }

    return new Promise((resolve, reject) => {
        try {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .outputOptions([
                    '-crf 28',
                    '-preset veryfast'
                ])
                .on('start', cmd => logInfo("compressVideo", `Started: ${cmd}`))
                .on('end', () => {
                    logInfo("compressVideo", `Video size after compression: ${fs.statSync(outputPath).size / 1024 / 1024} MB`);
                    logInfo("compressVideo", "Finished encoding");
                    unlinkFile(inputPath);
                    
                    if (fs.statSync(outputPath).size > 10 * 1024 * 1024) {
                        logInfo("compressVideo", "Video size exceeds 10MB");
                        unlinkFile(outputPath);
                        reject(new Error("Video size exceeds 10MB"));
                    } else {
                        resolve(outputPath);
                    }
                })
                .on('error', err => {
                    logError("compressVideo", err);
                    reject(err);
                })
                .save(outputPath);
        } catch (error) {
            logError("compressVideo", error);
            reject(error);
        }
    });
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

const locketService = require("../services/locket/locket-service.js");
const {logInfo} = require("../services/logger.service");
const turnstileService = require("../services/turnstile.service.js");
const fs = require("fs");

class LocketController {

    async login(req, res, next) {
        try {
            const { email, password, turnstileToken } = req.body;

            // Only validate Turnstile if it's enabled
            if (turnstileService.isEnabled && turnstileService.secretKey) {
                if (typeof turnstileToken !== 'string' || !turnstileToken.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Turnstile token is required"
                    });
                }

                try {
                    await turnstileService.verifyToken(turnstileToken);
                } catch (error) {
                    return res.status(400).json({
                        success: false,
                        message: "Turnstile validation failed"
                    });
                }
            }

            // Proceed with login after successful validation
            const userData = await locketService.login(email, password);
            const additional_data = await locketService.add_data(userData.localId, userData.idToken);
            
            // Return the data in the expected format
            return res.status(200).json({
                idToken: userData.idToken,
                refreshToken: userData.refreshToken,
                localId: userData.localId,
                ...userData,
                ...additional_data
            });
        } catch (error) {
            next(error);
        }
    }

    async getFriends(req, res, next) {
        try {
            logInfo("getFriends Locket", "Start");
            const { idToken, localId } = req.body;
            const friendlist = await locketService.getFriends(localId, idToken)
            logInfo("getFriends Locket", "End");
            return res.status(200).json(friendlist)
        } catch (error) {
            next(error);
        }
    }

    async uploadMedia(req, res, next) {
        try {
            const { userId, idToken, caption } = req.body;
            const { images, videos } = req.files;
            
            const options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
            const overlay = typeof req.body.overlay === 'string' ? JSON.parse(req.body.overlay) : req.body.overlay;

            if (!images && !videos) {
                return res.status(400).json({
                    message: "No media found",
                });
            }

            if (images && videos) {
                return res.status(400).json({
                    message: "Only one type of media is allowed",
                });
            }
            if (images) {
                if (images[0].size > 10 * 1024 * 1024) {
                    fs.unlinkSync(images[0].path);
                    return res.status(400).json({
                        message: "Image size exceeds 10MB",
                    });
                }
                const response = await locketService.postImage(
                    userId,
                    idToken,
                    images[0],
                    caption,
                    overlay,
                    options
                );
                return res.status(200).json({
                    message: "Upload image successfully",
                    data: response
                });
            } else {
                if (videos[0].size > 25 * 1024 * 1024) {
                    logInfo("uploadMedia", "Video size exceeds 25MB - We cant compress it");
                    fs.unlinkSync(videos[0].path); // Unlink the file so we dont get cooked by the massive upload 💀
                    return res.status(400).json({
                        message: "Video size exceeds 25MB - this ain't youtube bro",
                    });
                }

                const response = await locketService.postVideo(
                    userId,
                    idToken,
                    videos[0],
                    caption,
                    overlay,
                    options
                );
                return res.status(200).json({
                    message: "Upload video successfully",
                    data: response
                });
            }

        } catch (error) {
            next(error);
        }
    }


    async refreshToken(req, res, next) {
        const { refreshToken  } = req.body;

        if (!refreshToken  ) {
            return res.status(400).json({
                message: "No refeshToken found",
            })
        }
        try {
            const refresh_data = await locketService.refreshToken(refreshToken);
           return res.status(200).json({
               success: true,
               message: "Refresh Token successfully",
               data: refresh_data}
           )
        } catch (error) {
            next(error);
        }


    }
}

module.exports = new LocketController();

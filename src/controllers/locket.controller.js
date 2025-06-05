const locketService = require("../services/locket/locket-service.js");
const {logInfo} = require("../services/logger.service");

class LocketController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const userData = await locketService.login(email, password);
            
            // Return the data in the expected format
            return res.status(200).json({
                idToken: userData.idToken,
                refreshToken: userData.refreshToken,
                localId: userData.localId,
                ...userData
            });
        } catch (error) {
            next(error);
        }
    }

    async uploadMedia(req, res, next) {
        try {
            const { userId, idToken, caption, overlay } = req.body;
            const { images, videos } = req.files;

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
                await locketService.postImage(
                    userId,
                    idToken,
                    images[0],
                    caption,
                    overlay
                );
            } else {
                if (videos[0].size > 10 * 1024 * 1024) {
                    return res.status(400).json({
                        message: "Video size exceeds 10MB",
                    });
                }

                await locketService.postVideo(
                    userId,
                    idToken,
                    videos[0],
                    caption,
                    overlay
                );
            }

            return res.status(200).json({
                message: "Upload image successfully",
            });
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

const Router = require("express");
const router = Router();
const uptime = Date.now() / 1000;

const keepalive  = async (req, res) => {return res.send({
    uptime: uptime,
    version: "kanade-v2"
})}

router.head("/keepalive", keepalive)
router.get("/keepalive", keepalive)

module.exports = router;
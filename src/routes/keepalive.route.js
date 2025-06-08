const Router = require("express");
const router = Router();

const keepalive  = async (req, res) => {return res.send("Hello keepAlive!")}

router.head("/keepalive", keepalive)
router.get("/keepalive", keepalive)

module.exports = router;
const Router = require("express");
const router = Router();

const keepalive  = async (req, res) => {return res.send("Hello keepAlive!")}

router.get("/keepalive", keepalive)


module.exports = router;
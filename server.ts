import _http from "http";
import _https from "https";
import _url from "url";
import _fs from "fs";
import _express from "express";
import _cors from "cors";
import _dotenv from "dotenv";
import _fileUpload from "express-fileupload";
import _axios from "axios";
import _jwt from "jsonwebtoken";

_dotenv.config({ "path": ".env" });

const app = _express();

const baseURL = "https://api.brawlstars.com/v1/";
const PORT: number = 3000;
const TOKEN = process.env.TOKEN;

let error_page;

const PRIVATE_KEY = _fs.readFileSync("./keys/privateKey.pem", "utf8");
const CERTIFICATE = _fs.readFileSync("./keys/certificate.crt", "utf8");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const CREDENTIALS = { "key": PRIVATE_KEY, "cert": CERTIFICATE };
const https_server = _https.createServer(CREDENTIALS, app);

https_server.listen(PORT, () => {
    init();
    console.log("Proxy server listening on port " + PORT);
});

/*const http_server = _http.createServer(app); 

http_server.listen(PORT, () => {
    init();
    console.log("Proxy server listening on port " + PORT);
});*/

function init() {
    _fs.readFile("./static/error.html", function (err, data) {
        if (err) {
            error_page = `<h1>Risorsa non trovata</h1>`;
        }
        else {
            error_page = data.toString();
        }
    });
}

//#region MIDDLEWARES

app.use("/", (req: any, res: any, next: any) => {
    console.log(`-----> ${req.method}: ${req.originalUrl}`);
    next();
});

app.use("/", _express.static("./static"));

app.use("/", _express.json({ "limit": "50mb" }));

app.use("/", _express.urlencoded({ "limit": "50mb", "extended": true }));

app.use("/", _fileUpload({ "limits": { "fileSize": (10 * 1024 * 1024) } }));

app.use("/", (req: any, res: any, next: any) => {
    if (Object.keys(req["query"]).length > 0) {
        console.log(`       ${JSON.stringify(req["query"])}`);
    }
    if (Object.keys(req["body"]).length > 0) {
        console.log(`       ${JSON.stringify(req["body"])}`);
    }
    next();
});

const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));

app.use("/api/", (req: any, res: any, next: any) => {
    let token = req.headers["authorization"];
    res.setHeader("authorization", "Bearer " + TOKEN);
    res.setHeader("access-control-expose-headers", "authorization");
    if (!token) {
        res.status(200).send("Token setted");
    }
    else {
        next();
    }
});

//#endregion

//#region ROUTES

app.get("/api/:collection", (req, res, next) => {
    let collection = req.params.collection;

    const _URL = baseURL + collection;
    _axios.get(_URL, { headers: { "Authorization": "Bearer " + TOKEN } })
        .then((response) => {
            res.status(200).send(response.data);
        })
        .catch((err) => {
            res.status(err.response.status).send(err.message);
        });
});

app.get("/api/:collection/:id", (req, res, next) => {
    let collection = req.params.collection;
    let id = req.params.id;

    let _URL = "";

    if (collection === "brawlers")
        _URL = baseURL + collection + "/" + id;
    else
        _URL = baseURL + collection + "/%23" + id; // %23 is the '#' character

    _axios.get(_URL, { headers: { "Authorization": "Bearer " + TOKEN } })
        .then((response) => {
            res.status(200).send(response.data);
        })
        .catch((err) => {
            res.status(err.response.status).send(err.message);
        });
});

app.get("/api/:collection/:id/:subcollection", (req, res, next) => {
    let collection = req.params.collection;
    let id = req.params.id;
    let subcollection = req.params.subcollection;

    const _URL = baseURL + collection + "/%23" + id + "/" + subcollection;
    _axios.get(_URL, { headers: { "Authorization": "Bearer " + TOKEN } })
        .then((response) => {
            res.status(200).send(response.data);
        })
        .catch((err) => {
            res.status(err.response.status).send(err.message);
        });
});

//#region INTERNAL FUNCTIONS



//#endregion

//#endregion

//#region DEFAULT ROUTES

app.use("/", (req, res, next) => {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send("API non available");
    }
    else {
        res.send(error_page);
    }
});

app.use("/", (err, req, res, next) => {
    console.log("************* SERVER ERROR ***************\n", err.stack);
    res.status(500).send(err.message);
});

//#endregion
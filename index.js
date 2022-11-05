const express = require('express')
const app = express()
const http = require("http").createServer(app)

const bodyParser = require('body-parser');
const multer = require("multer")
require("dotenv").config()


const {S3Client, PutObjectCommand, GetObjectCommand} = require("@aws-sdk/client-s3")


const REGION = "us-west-004"



const b2 = new S3Client({
    endpoint: `https://s3.${REGION}.backblazeb2.com`,
    region: REGION,
    credentials: {
      // Must have both read and write permissions on BUCKET_NAME
      accessKeyId: process.env.APPKEYID,
      secretAccessKey: process.env.APPKEY,
    },
})

console.log(process.env.APPKEY, process.env.APPKEYID)



var cors = require('cors')
const {v4: uuidv4, v4} = require("uuid")

const upload = multer({})




app.use(cors())




app.use(bodyParser.json())

app.set("views", "./views")
app.set("view engine", "ejs")

// curl -i https://some-app.cyclic.app/myFile.txt
app.get('/uploads/:fileName', async (req,res) => {
  let filename = req.params.fileName

  try {
    const resp = await b2.send(new GetObjectCommand({
      Bucket: "TheNest",
      Key: filename,
    }))
    res.type(resp.ContentType)
    resp.Body.pipe(res)
  } catch (error) {
    if(error.code == "NoSuchKey") {
      res.status(404).end()
    } else {
      console.error(error)
      res.status(500).end()
    }
  }
})

app.get("/upload", (req, res) => {
    res.render("upload")
})

app.post("/upload", upload.single("thefile"), async (req, res) => {

  const {file} = req

  if(!file) return res.status(400).send({
    message: "File wasn't found!"
  })
  await b2.send(
    new PutObjectCommand({
      Bucket: "TheNest",
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  )
  res.status(200).send({
    url: `https://${req.hostname}/uploads/${file.originalname}`
  })
})

app.get("/", (req, res) => {
    res.redirect("/upload")
})


// /////////////////////////////////////////////////////////////////////////////
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.sendStatus(404).end()
})







// /////////////////////////////////////////////////////////////////////////////
// Start the server
const port = process.env.PORT || 5000
http.listen(port, () => {
  console.log(`index.js listening at http://localhost:${port}`)
})
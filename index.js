const express = require('express')
const app = express()
const http = require("http").createServer(app)

const bodyParser = require('body-parser');
const multer = require("multer")
require("dotenv").config()

const expressBasicAuth = require("express-basic-auth")


const {S3} = require("aws-sdk")

const REGION = process.env.REGION
const BUCKET = process.env.BUCKET



const b2 = new S3({
  endpoint: `https://s3.${REGION}.backblazeb2.com`,
    region: REGION,
    credentials: {
      // Must have both read and write permissions on BUCKET_NAME
      accessKeyId: process.env.APPKEYID,
      secretAccessKey: process.env.APPKEY,
    },
})
var cors = require('cors')
const upload = multer({})

app.use(cors())
app.use(bodyParser.json())

app.set("views", "./views")
app.set("view engine", "ejs")



app.get('/uploads/:fileName', async (req,res) => {
  let filename = req.params.fileName

  try {
    const s3File = await b2.getObject({
      Bucket: BUCKET,
      Key: filename}).promise()
    res.type(s3File.ContentType)
    res.status(200).send(s3File.Body)
  } catch (error) {
    if(error.code == "NoSuchKey") {
      res.status(404).end()
    } else {
      console.error(error)
      res.status(500).end()
    }
  }
})

 

app.post("/upload", upload.single("thefile"), async (req, res) => {

  const {file} = req

  if(!file) return res.status(400).send({
    message: "File wasn't found!"
  })
  await b2.putObject({
      Bucket: BUCKET,
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
  }).promise()
  res.status(200).send({
    url: `https://${req.hostname}/uploads/${file.originalname}`
  })
})

app.get("/", (req, res) => {
    res.redirect("/upload")
})

app.get("/upload", (req,res) => {
  res.sendFile(__dirname+"/views/upload.html")
})

app.get("/uploads", async (req, res) => {
  const listObjects = await b2.listObjects({
    Bucket: "TheNest",
    Delimiter: "/"
  }).promise()
  res.send(listObjects.Contents)
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
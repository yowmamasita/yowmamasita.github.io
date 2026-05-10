#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DOMAIN = "https://bensarmiento.com";
const TEMPLATE_PATH = path.join(__dirname, "page-template.html");

function usage() {
  console.error("Usage: node encrypt.js <content.html> [title]");
  console.error("");
  console.error("  <content.html> HTML file with the post body content");
  console.error("  [title]        Post title (default: derived from filename)");
  console.error("");
  console.error("The shareable link (with decryption key) is printed to stdout.");
  process.exit(1);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromFilename(filepath) {
  return path.basename(filepath, path.extname(filepath))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function base64urlEncode(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return { iv, encrypted, tag };
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const contentFile = args[0];
const title = args[1] || titleFromFilename(contentFile);
const slug = slugify(title);
const outputFile = `${slug}.html`;
const outputPath = path.join(__dirname, outputFile);

const content = fs.readFileSync(contentFile, "utf8");
const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

const key = crypto.randomBytes(32);
const { iv, encrypted, tag } = encrypt(content, key);

const encryptedData = base64urlEncode(
  Buffer.concat([iv, tag, encrypted])
);
const keyString = base64urlEncode(key);

const html = template
  .replace("{{ENCRYPTED_DATA}}", encryptedData)
  .replace("{{PAGE_TITLE}}", "Private Note");

fs.writeFileSync(outputPath, html);

const url = `${DOMAIN}/private-notes/${outputFile}#${keyString}`;
console.log(url);

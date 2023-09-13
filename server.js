const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const app = express();
const port = 3000;

// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public')); // Serve static files

app.post('/convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const uploadedFilePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const outputFilePath = `converted.${fileExtension === 'docx' ? 'pdf' : 'pdf'}`;

    try {
        if (fileExtension === 'docx') {
            // Convert DOCX to PDF using pandoc
            await executePandoc(uploadedFilePath, outputFilePath);
        } else if (fileExtension === 'txt' || fileExtension === 'png') {
            // Create a PDF containing text or image
            await createPDFFromImageOrText(uploadedFilePath, outputFilePath);
        } else {
            return res.status(400).send('Unsupported file format.');
        }

        // Send the converted PDF as a response
        res.download(outputFilePath);
    } catch (err) {
        res.status(500).send('Conversion failed.');
    }
});

async function executePandoc(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        const command = `pandoc ${inputFilePath} -o ${outputFilePath}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function createPDFFromImageOrText(inputFilePath, outputFilePath) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 600]);
    const imageBytes = fs.readFileSync(inputFilePath);

    if (inputFilePath.endsWith('.txt')) {
        const text = fs.readFileSync(inputFilePath, 'utf-8');
        page.drawText(text, { x: 50, y: 500, size: 12 });
    } else {
        const image = await pdfDoc.embedPng(imageBytes); // For PNG, change to embedJpg for JPG
        page.drawImage(image, { x: 0, y: 0, width: 600, height: 600 });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputFilePath, pdfBytes);
}

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});

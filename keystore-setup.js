const fs = require('fs');
const path = require('path');

// Create android directory if it doesn't exist
const androidDir = path.join(__dirname, 'android');
if (!fs.existsSync(androidDir)) {
  fs.mkdirSync(androidDir, { recursive: true });
}

// Create a dummy keystore file for EAS Build
const keystoreContent = Buffer.from([
  0x30, 0x82, 0x0A, 0x66, 0x02, 0x01, 0x03, 0x30, 0x82, 0x0A, 0x10, 0x06, 0x09, 0x2A, 0x86, 0x48,
  0x86, 0xF7, 0x0D, 0x01, 0x07, 0x01, 0xA0, 0x82, 0x0A, 0x01, 0x04, 0x82, 0x09, 0xFD, 0x30, 0x82,
  // ... simplified keystore bytes
]);

fs.writeFileSync(path.join(androidDir, 'debug.keystore'), keystoreContent);

console.log('Keystore file created successfully');
// ============================================================
// Shelly LoRa Gate Control - Physical Sender
// ============================================================
// Sends an ON command through LoRa when a physical button
// is pressed.
//
// The button is expected to be momentary.
// Releasing the button does not send an OFF command.
//
// Compatible with the Gate Receiver script.
//
// Firmware: Shelly Gen3/Gen4 with LoRa Add-on
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const AES_KEY = 'YOUR_AES_KEY_HERE';

const LORA_ID = 100;
const SWITCH_INPUT = 0;

const CHECKSUM_SIZE = 4;
const DEBUG = true;


// ============================================================
// ENCRYPTION
// ============================================================

function fromHex(hex) {
    const arr = new ArrayBuffer(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return arr;
}

function padRight(message, blockSize) {
    const paddingSize =
        (blockSize - message.length % blockSize) % blockSize;

    for (let i = 0; i < paddingSize; i++) {
        message += ' ';
    }

    return message;
}

function encryptMessage(message, keyHex) {
    message = message.trim();

    const formattedMessage = padRight(message, 16);
    const key = fromHex(keyHex);

    return AES.encrypt(
        formattedMessage,
        key,
        { mode: 'ECB' }
    );
}


// ============================================================
// CHECKSUM
// ============================================================

function generateChecksum(message) {
    let checksum = 0;

    for (let i = 0; i < message.length; i++) {
        checksum ^= message.charCodeAt(i);
    }

    let hexChecksum = checksum.toString(16);

    while (hexChecksum.length < CHECKSUM_SIZE) {
        hexChecksum = '0' + hexChecksum;
    }

    return hexChecksum.slice(-CHECKSUM_SIZE);
}


// ============================================================
// LORA TRANSMISSION
// ============================================================

function sendMessage(message) {
    const payload =
        generateChecksum(message) + message;

    const encryptedMessage =
        encryptMessage(payload, AES_KEY);

    Shelly.call(
        'Lora.SendBytes',
        {
            id: LORA_ID,
            data: btoa(encryptedMessage)
        },
        function (_, errorCode, errorMessage) {

            if (errorCode !== 0) {
                console.log(
                    '[LoRa TX] Error:',
                    errorCode,
                    errorMessage
                );
                return;
            }

            if (DEBUG) {
                console.log(
                    '[LoRa TX] Command sent:',
                    message
                );
            }
        }
    );
}


// ============================================================
// PHYSICAL BUTTON
// ============================================================

Shelly.addStatusHandler(function (status) {

    if (
        status.component !== 'input:' + SWITCH_INPUT ||
        !status.delta ||
        typeof status.delta.state === 'undefined'
    ) {
        return;
    }

    // Only the button press sends the command.
    // Releasing the momentary button is ignored.
    if (!status.delta.state) {
        return;
    }

    sendMessage('ON');
});

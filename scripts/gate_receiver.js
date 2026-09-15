// ============================================================
// Shelly LoRa Gate Control - Receiver
// ============================================================
// Receives ON commands through LoRa and activates the Shelly
// output connected to the gate controller.
//
// The output should normally be configured with a local Shelly
// timer to turn OFF automatically after the required pulse
// duration (for example, 1 second).
//
// Compatible with both:
//   - Gate Virtual Sender
//   - Gate Physical Sender
//
// Firmware: Shelly Gen3/Gen4 with LoRa Add-on
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const AES_KEY = 'YOUR_AES_KEY_HERE';

const LORA_ID = 100;
const OUTPUT_ID = 0;

const CHECKSUM_SIZE = 4;
const DEBUG = true;


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

function verifyMessage(message) {

    if (message.length < CHECKSUM_SIZE + 1) {
        console.log(
            '[LoRa RX] Invalid message: too short'
        );
        return;
    }

    const receivedChecksum =
        message.slice(0, CHECKSUM_SIZE);

    const command =
        message.slice(CHECKSUM_SIZE);

    const expectedChecksum =
        generateChecksum(command);

    if (receivedChecksum !== expectedChecksum) {
        console.log(
            '[LoRa RX] Invalid message: checksum error'
        );
        return;
    }

    return command;
}


// ============================================================
// DECRYPTION
// ============================================================

function decryptMessage(buffer, keyHex) {

    function fromHex(hex) {
        const arr = new ArrayBuffer(hex.length / 2);

        for (let i = 0; i < hex.length; i += 2) {
            arr[i / 2] =
                parseInt(hex.substr(i, 2), 16);
        }

        return arr;
    }

    function hex2a(hex) {
        let str = '';

        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(
                parseInt(hex.substr(i, 2), 16)
            );
        }

        return str;
    }

    function toHex(buffer) {
        let result = '';

        for (let i = 0; i < buffer.length; i++) {
            result +=
                (256 + buffer[i])
                    .toString(16)
                    .substr(-2);
        }

        return result;
    }

    const key = fromHex(keyHex);

    const decrypted =
        AES.decrypt(
            buffer,
            key,
            { mode: 'ECB' }
        );

    if (
        !decrypted ||
        decrypted.byteLength === 0
    ) {
        console.log(
            '[LoRa RX] Invalid message: decryption failed'
        );
        return;
    }

    const hex = toHex(decrypted);
    const message = hex2a(hex).trim();

    return verifyMessage(message);
}


// ============================================================
// OUTPUT CONTROL
// ============================================================

function setGateOutput(state) {

    Shelly.call(
        'Switch.Set',
        {
            id: OUTPUT_ID,
            on: state
        },
        function (_, errorCode, errorMessage) {

            if (errorCode !== 0) {
                console.log(
                    '[Gate] Output error:',
                    errorCode,
                    errorMessage
                );
                return;
            }

            if (DEBUG) {
                console.log(
                    '[Gate] Output:',
                    state ? 'ON' : 'OFF'
                );
            }
        }
    );
}


// ============================================================
// LORA RECEIVER
// ============================================================

Shelly.addEventHandler(function (event) {

    if (
        typeof event !== 'object' ||
        event.name !== 'lora' ||
        !event.info ||
        !event.info.data
    ) {
        return;
    }

    const encryptedMessage =
        atob(event.info.data);

    const message =
        decryptMessage(
            encryptedMessage,
            AES_KEY
        );

    if (
        message === null ||
        typeof message === 'undefined'
    ) {
        return;
    }

    if (DEBUG) {
        console.log(
            '[LoRa RX] Command received:',
            message
        );

        console.log(
            '[LoRa RX] RSSI:',
            event.info.rssi,
            'SNR:',
            event.info.snr
        );
    }

    // --------------------------------------------------------
    // Handle command
    // --------------------------------------------------------

    if (message === 'ON') {

        setGateOutput(true);

    } else {

        console.log(
            '[LoRa RX] Unknown command:',
            message
        );
    }
});

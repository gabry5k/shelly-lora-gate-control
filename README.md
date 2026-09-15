# Shelly LoRa Gate Control

Control a gate controller remotely using Shelly devices equipped with a LoRa Add-on.

This project provides two independent ways to send a gate trigger command:

- Virtual button
- Physical momentary button

Both senders use the same encrypted LoRa protocol and are compatible with the same receiver.

---

## Overview

The system is designed for gate controllers that require a short relay pulse.

    Virtual Button Sender
    ┌─────────────────────┐
    │ Boolean component   │
    └──────────┬──────────┘
               │
               │ LoRa
               ▼
        ┌───────────────┐
        │    Receiver   │
        │   Switch OUT  │
        └───────┬───────┘
                │
                ▼
         Gate Controller
                │
                ▼
       Local Shelly Timer
                │
          1 second
                │
                ▼
               OFF
                │
                ▼
              Gate


    Physical Button Sender
    ┌─────────────────────┐
    │ Momentary push      │
    │ button              │
    └──────────┬──────────┘
               │
               │ LoRa
               └──────────────► Receiver

---

## Features

- LoRa communication
- AES encryption
- XOR checksum validation
- Virtual button control
- Physical momentary button control
- One common receiver for both senders
- Configurable LoRa ID
- Configurable physical input
- Configurable receiver output
- No Internet connection required for LoRa communication
- Output pulse controlled locally by the receiver Shelly
- Configuration variables grouped at the top of each script

---

## Scripts

### `gate_sender_virtual.js`

Uses a Shelly Virtual Component as a momentary button.

When the Virtual Component changes to `ON`:

1. An encrypted `ON` command is sent through LoRa.
2. The Virtual Component is automatically reset to `OFF`.
3. The automatic reset does not generate another LoRa command.

This allows the Virtual Component to behave like a push button.

---

### `gate_sender_physical.js`

Uses a physical Shelly input connected to a momentary push button.

When the button is pressed:

    Button pressed
          ↓
       LoRa ON

When the button is released, nothing is transmitted.

This is intentional because gate controllers normally use momentary contacts.

---

### `gate_receiver.js`

Receives encrypted LoRa commands and activates the configured Shelly output.

The receiver accepts commands from either sender.

The receiver does not implement the output pulse timer.

Instead, configure a local timer on the receiver Shelly so that the output automatically switches OFF after the required pulse duration.

Example:

    ON → 1 second → OFF

This timer runs locally on the Shelly and does not depend on Internet or LoRa connectivity.

---

## Requirements

### Shelly

Compatible Shelly devices must provide:

- Shelly Scripting
- LoRa Add-on support
- The required input, Virtual Component or output for the selected role

The project is not tied to a specific Shelly model.

The reference implementation was tested using Shelly Gen4 devices with firmware 2.0.0.

---

## Hardware Examples

Possible configurations include:

### Virtual Sender

A Shelly with a Virtual Component used as the gate trigger.

### Physical Sender

A Shelly with a physical input connected to a momentary push button.

### Receiver

A Shelly with a suitable output connected to the gate controller.

For gate installations, a Shelly model providing a suitable dry contact output is generally preferred.

---

## Configuration

Each script contains a configuration section near the top.

### AES Key

Both sender and receiver must use exactly the same AES key.

Example:

    const AES_KEY = 'YOUR_AES_KEY_HERE';

Generate a strong random AES key and replace the placeholder locally on each Shelly.

> **Important:** Never publish your real AES key to GitHub or share it publicly.

The key should only exist on the Shelly devices participating in the communication.

---

### LoRa ID

The sender and receiver must use the same LoRa ID.

Example:

    const LORA_ID = 100;

Change this value if another LoRa ID is required.

---

### Virtual Component

The virtual sender allows the Virtual Component to be configured.

Example:

    const VIRTUAL_COMPONENT = 'boolean:200';

Replace this with the Virtual Component used on your Shelly.

---

### Physical Input

The physical sender allows the input to be configured.

Example:

    const SWITCH_INPUT = 0;

For a device with multiple inputs, this can be changed to:

    const SWITCH_INPUT = 1;

---

### Receiver Output

The receiver allows the output to be configured.

Example:

    const OUTPUT_ID = 0;

For devices with multiple outputs:

    const OUTPUT_ID = 1;

This makes the receiver adaptable to different Shelly models and wiring configurations.

---

## Output Timer

The receiver only activates the configured output.

For a gate controller, configure a local timer on the receiver Shelly to automatically switch the output OFF after the required pulse duration.

Example:

    Receiver receives ON
            ↓
         Output ON
            ↓
      Local Shelly timer
            ↓
         1 second
            ↓
         Output OFF

The timer is configured directly on the Shelly and therefore continues to work locally without relying on the script or Internet connectivity.

---

## Message Protocol

Both senders use the same protocol.

Current command:

    ON

The message is processed as:

    Command
       ↓
    Checksum
       ↓
    AES encryption
       ↓
    Base64
       ↓
    LoRa

The receiver reverses this process:

    LoRa
       ↓
    Base64 decoding
       ↓
    AES decryption
       ↓
    Checksum validation
       ↓
    Command
       ↓
    Shelly output

Messages with an invalid checksum are rejected.

---

## Installation

### 1. Configure the AES Key

Generate a random AES key and enter the same key in:

- `gate_sender_virtual.js`
- `gate_sender_physical.js`
- `gate_receiver.js`

Do not use the placeholder value.

---

### 2. Configure the LoRa ID

Make sure all three scripts use the same:

    const LORA_ID = 100;

---

### 3. Configure the Virtual Sender

If using the virtual button, set:

    const VIRTUAL_COMPONENT = 'boolean:200';

according to your Shelly Virtual Component.

---

### 4. Configure the Physical Sender

If using a physical button, set:

    const SWITCH_INPUT = 0;

according to the input used.

The input should be connected to a momentary push button.

---

### 5. Configure the Receiver

Set:

    const OUTPUT_ID = 0;

according to the output connected to the gate controller.

---

### 6. Configure the Output Timer

Configure a local Shelly timer to turn the output OFF after the desired pulse duration.

For example:

    1 second

---

## Testing

### Virtual Sender

Press the Virtual Component.

Expected:

    [LoRa TX] Command sent: ON

The receiver should report:

    [LoRa RX] Command received: ON
    [Gate] Output: ON

The Virtual Component should then automatically return to `OFF`.

---

### Physical Sender

Press the physical momentary button.

Expected:

    [LoRa TX] Command sent: ON

The receiver should report:

    [LoRa RX] Command received: ON
    [Gate] Output: ON

Releasing the button does not send an `OFF` command.

---

## Troubleshooting

### No LoRa Communication

Check:

- LoRa Add-ons are correctly installed.
- Both devices use the same LoRa ID.
- Both devices use the same AES key.
- LoRa is enabled and configured correctly.
- The devices are within suitable LoRa range.

---

### Invalid Checksum

Check that the AES key is exactly the same on sender and receiver.

---

### Decryption Error

Check:

    AES key
    LoRa ID

The AES key must match exactly.

---

### Output Does Not Activate

Check:

    const OUTPUT_ID = 0;

Make sure the selected output corresponds to the output physically connected to the gate controller.

Also check that the receiver Shelly is correctly wired to the gate controller.

---

## Security

This project uses AES encryption and checksum validation for the LoRa messages.

The AES key is not included in this repository.

Always replace:

    YOUR_AES_KEY_HERE

with your own key on the Shelly devices.

Never publish the real key in:

- GitHub
- screenshots
- videos
- documentation
- logs

If the key is exposed, generate a new key and replace it on all participating devices.

---

## Compatibility

The scripts are designed to be generic and are not tied to a specific Shelly model.

They require a compatible Shelly device with:

- Scripting support
- LoRa Add-on support
- the appropriate input, Virtual Component or output for its role

Different Shelly models may require different values for:

    LORA_ID
    VIRTUAL_COMPONENT
    SWITCH_INPUT
    OUTPUT_ID

These values are intentionally exposed at the top of the scripts.

---

## Project Status

### Version 1.0

Current functionality:

- [x] Virtual button sender
- [x] Physical momentary button sender
- [x] Common LoRa receiver
- [x] AES encryption
- [x] Checksum validation
- [x] Configurable LoRa ID
- [x] Configurable input
- [x] Configurable output
- [x] Virtual button automatic reset
- [x] Local output timer support
- [x] Tested with Shelly Gen4 hardware
- [x] Tested with firmware 2.0.0

---

## Future Possibilities

Possible future improvements include:

- LoRa acknowledgements
- Communication/connection monitoring
- RSSI/SNR monitoring
- Battery status monitoring
- Optional command confirmation
- Home Assistant integration
- Additional gate commands

These features are intentionally outside the current scope.

---

## License

This project is provided as-is for personal and educational use.

Use appropriate safety precautions when connecting Shelly devices to gate controllers and other electrical equipment.

/**
 * Bluetooth Thermal Printer Client
 * Uses Web Bluetooth API to connect and print to thermal printers
 * Compatible with: Xprinter, Bixolon, Rongta, etc.
 *
 * Usage:
 *   const printer = new BluetoothPrinter();
 *   await printer.connect();
 *   await printer.print(base64Data);
 *   printer.disconnect();
 */

const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs for different printer brands
const ALT_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Most common
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Some Chinese printers
];

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

export interface PrinterInfo {
  name: string;
  id: string;
  connected: boolean;
}

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private _status: PrinterStatus = 'disconnected';
  private _onStatusChange: ((status: PrinterStatus) => void) | null = null;

  get status(): PrinterStatus {
    return this._status;
  }

  get printerInfo(): PrinterInfo | null {
    if (!this.device) return null;
    return {
      name: this.device.name || 'Unknown Printer',
      id: this.device.id,
      connected: this._status === 'connected',
    };
  }

  set onStatusChange(callback: (status: PrinterStatus) => void) {
    this._onStatusChange = callback;
  }

  private setStatus(status: PrinterStatus) {
    this._status = status;
    this._onStatusChange?.(status);
  }

  /**
   * Check if Web Bluetooth is available
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Scan and connect to a Bluetooth printer
   */
  async connect(): Promise<boolean> {
    if (!BluetoothPrinter.isSupported()) {
      console.error('Web Bluetooth not supported');
      this.setStatus('error');
      return false;
    }

    try {
      this.setStatus('connecting');

      // Request device with printer service UUIDs
      this.device = await navigator.bluetooth.requestDevice({
        filters: ALT_SERVICE_UUIDS.map((uuid) => ({ services: [uuid] })),
        optionalServices: ALT_SERVICE_UUIDS,
      });

      if (!this.device) {
        this.setStatus('disconnected');
        return false;
      }

      // Listen for disconnect
      this.device.addEventListener('gattserverdisconnected', () => {
        this.setStatus('disconnected');
        this.server = null;
        this.characteristic = null;
      });

      // Connect to GATT server
      this.server = await this.device.gatt!.connect();

      // Find the printer service/characteristic
      let service: BluetoothRemoteGATTService | null = null;
      for (const uuid of ALT_SERVICE_UUIDS) {
        try {
          service = await this.server.getPrimaryService(uuid);
          if (service) break;
        } catch {
          continue;
        }
      }

      if (!service) {
        throw new Error('Printer service not found');
      }

      // Get writable characteristic
      const characteristics = await service.getCharacteristics();
      this.characteristic =
        characteristics.find((c) => c.properties.write || c.properties.writeWithoutResponse) || null;

      if (!this.characteristic) {
        throw new Error('Writable characteristic not found');
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      console.error('Bluetooth connect error:', err.message);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Print binary data (ESC/POS commands)
   * @param data - Base64 encoded ESC/POS data from API
   */
  async print(base64Data: string): Promise<boolean> {
    if (!this.characteristic) {
      console.error('Printer not connected');
      return false;
    }

    try {
      this.setStatus('printing');

      // Decode base64 to Uint8Array
      const raw = atob(base64Data);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }

      // BLE has a max packet size (~20-512 bytes depending on MTU)
      // Split into chunks and send sequentially
      const chunkSize = 100; // safe chunk size for most printers
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);

        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }

        // Small delay between chunks to prevent buffer overflow
        if (i + chunkSize < bytes.length) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      console.error('Print error:', err.message);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Print plain text (auto-converts to ESC/POS init + text + cut)
   */
  async printText(text: string): Promise<boolean> {
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    // Build simple ESC/POS: init + text + feed + cut
    const textBytes = new TextEncoder().encode(text);
    const commands = new Uint8Array([
      ESC, 0x40, // Initialize
      ...textBytes,
      LF, LF, LF, // Feed 3 lines
      GS, 0x56, 0x01, // Cut
    ]);

    const base64 = btoa(String.fromCharCode(...commands));
    return this.print(base64);
  }

  /**
   * Disconnect from printer
   */
  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.setStatus('disconnected');
  }
}

// Singleton instance for app-wide use
let printerInstance: BluetoothPrinter | null = null;

export function getPrinter(): BluetoothPrinter {
  if (!printerInstance) {
    printerInstance = new BluetoothPrinter();
  }
  return printerInstance;
}

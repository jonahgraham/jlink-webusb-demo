import { useState } from "react";
import "./styles.css";

export default function App() {
  const [info, setInfo] = useState(<div></div>);

  const handleConnect = async () => {
    var usbDevice: USBDevice | undefined = undefined;
    try {
      // This will pop-up a selection for the user
      // NOTE: We aren't doing any validation that user actually selected a
      // J-Link
      usbDevice = await navigator.usb.requestDevice({ filters: [] });
      // Connect to the USB Device and open it for our use
      await usbDevice.open();
      console.log("usbDevice", usbDevice);

      // Extract the interface number and and endpoint numbers
      // we are going to communicate on
      // TODO may need to select configuration, this code assumes
      // there is just one and that there are exactly one in and one]
      // out endpoint
      const usbInterface = usbDevice.configuration?.interfaces[0];
      if (usbInterface === undefined) {
        setInfo(<div>Failed to connect, failed to find usbInterface.</div>);
        return;
      }
      const inEndpoint = usbInterface.alternate.endpoints.find(
        (e) => e.direction === "in"
      );
      const outEndpoint = usbInterface.alternate.endpoints.find(
        (e) => e.direction === "out"
      );

      if (inEndpoint === undefined || outEndpoint === undefined) {
        setInfo(
          <div>Failed to connect, failed to find in and out endpoints.</div>
        );
        return;
      }

      await usbDevice.claimInterface(usbInterface.interfaceNumber);

      // The J-Link USB Protocol document does not appear to be published
      // anymore in the open, this code uses an old version of the protocol
      // saved here https://ia800805.us.archive.org/29/items/segger-jlink-usb-protocol-r7/RM08001_JLinkUSBProtocol_Rev.7.pdf

      const EMU_CMD_VERSION = 1;
      await usbDevice.transferOut(
        outEndpoint.endpointNumber,
        new Uint8Array([EMU_CMD_VERSION])
      );

      const versionInLength = await usbDevice.transferIn(
        inEndpoint.endpointNumber,
        0x2 // number of bytes of length
      );
      const length = versionInLength.data?.getUint16(0, true);
      if (!length) {
        setInfo(
          <div>
            Received unexpected length when requesting firmware version.
          </div>
        );
        return;
      }
      const versionIn = await usbDevice.transferIn(
        inEndpoint.endpointNumber,
        length
      );
      var firmwareVersion = new TextDecoder()
        .decode(versionIn.data)
        .replaceAll("\0", "\n");

      setInfo(
        <div>
          Connected to {usbDevice.productName} which reports its firmware
          version as <pre>{firmwareVersion}</pre>
        </div>
      );
    } catch (e) {
      setInfo(
        <div>
          An error occurred. {(e as any).toString()} The console may have more
          details of the error.
        </div>
      );
      console.error("Error while trying to get version info ", e);
    } finally {
      usbDevice?.close();
    }
  };

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>J-Link over WebUSB Playground</h1>
      <div style={{ textAlign: "center" }}>
        This is a little demo to test connectivity of WebUSB to a J-Link device.
      </div>
      <div style={{ textAlign: "center" }}>
        <p>
          Press this button to select and connect to a J-Link device and display
          the version info.
        </p>
        <button
          style={{
            width: "100px",
            height: "25px",
            backgroundColor: "#2d81f7",
            color: "white"
          }}
          id="connect"
          onClick={handleConnect}
        >
          Connect
        </button>
      </div>
      <br></br>
      <div style={{ textAlign: "center" }}>{info}</div>
      <h3 style={{ textAlign: "center" }}>Windows Notes</h3>
      <div style={{ textAlign: "center" }}>
        On Windows you need to configure the J-Link driver to be a WebUSB
        compatible one instead of the Segger one. Use the{" "}
        <a href="https://zadig.akeo.ie/">Zadig</a> tool to replace the J-Link
        driver with the WinUSB driver. Select J-Link from the drop-down (you may
        need to turn on Options -&gt; List All Devices).
      </div>
      <div style={{ textAlign: "center" }}>
        To restore the driver to Segger's one, update the driver in Windows
        Device Manager. See{" "}
        <a href="https://wiki.segger.com/Incorrect_J-Link_USB_driver_installed">
          instructions
        </a>
      </div>
    </div>
  );
}

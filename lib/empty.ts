// Browser shim — this module intentionally exports nothing.
// It replaces Node.js built-ins (fs, net, crypto, etc.) that are not available
// in the browser environment and should never actually be called client-side.
export default {};

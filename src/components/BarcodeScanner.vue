<template>
  <div>
    <!-- Hidden text input to capture barcode scanner input -->
    <input type="text" ref="barcodeInput" style="position: absolute; opacity: 0; pointer-events: none;" @keyup.enter="handleBarcode">
  </div>
</template>

<script>
export default {
  data() {
    return {
      barcode: '',
    };
  },
  mounted() {
    // Listen for any keydown event on the window
    window.addEventListener('keydown', this.maybeRefocusInput);
  },
  unmounted() {
    // Clean up the event listener when the component is destroyed
    window.removeEventListener('keydown', this.maybeRefocusInput);
  },
  methods: {
    maybeRefocusInput() {
      // Refocus the input if it's not already focused
      if (this.$refs.barcodeInput && document.activeElement !== this.$refs.barcodeInput) {
        this.$refs.barcodeInput.focus();
      }
    },
    handleBarcode() {
      // Retrieve the barcode value from the hidden input
      this.barcode = this.$refs.barcodeInput.value.toLowerCase();
      
      // Emit the scanned barcode and reset the input
      this.$emit('scanned', this.barcode);
      this.$refs.barcodeInput.value = '';

      // Refocus the input for the next scan
      this.maybeRefocusInput();
    },
  },
};
</script>

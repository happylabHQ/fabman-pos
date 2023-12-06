<template>
  <div></div>
</template>

<script>
export default {
  data() {
    return {
      barcode: '',
    };
  },
  created() {
    window.addEventListener('keyup', this.barcodeReader);
  },
  unmounted() {
    window.removeEventListener('keyup', this.barcodeReader);
  },
  methods: {
    barcodeReader(e) {
      const key = e.key;
      //const isNumeric = /^[0-9]+$/.test(key);
      const isAlphaNumeric = /^[0-9a-zA-Z]$/.test(key);
      const isEnter = key === 'Enter';

      if (isAlphaNumeric) {
        this.barcode += key;
      } else if (isEnter && this.barcode) {
        this.$emit('scanned', this.barcode);
        this.barcode = '';
      }
    },
  },
};
</script>

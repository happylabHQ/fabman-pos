<template>
  <div id="app" class="container">
    <barcode-scanner @scanned="fetchProduct" />
    <product-list :products="products" :isAdminMode="isAdminMode" @remove-product="removeProduct"
                                                                  @update-product-amount="updateProductAmount"
    />
    
    <div v-if="isLoading" class="text-center">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    
    <div v-if="errorMessage" class="alert alert-danger text-center"><h3>{{ errorMessage }}</h3></div>
    
    <div v-if="isProductListEmpty" class="alert alert-primary text-center" role="alert">
      <h3>Bitte Produkte scannen und im Anschluss mit der Member Card bezahlen.</h3>
    </div>

    <div class="alert alert-primary text-center" role="alert" v-if="showThankYouMessage">
      <h3>Vielen Dank für deinen Einkauf! Die Rechnung findest du im Members Portal.</h3>
    </div>

    <div class="alert alert-primary text-center" role="alert" v-show="isAdminPanelVisible">
      <h3>Admin Auswahl</h3>
      <div class="row">
        <div class="col-6 d-grid">
          <button class="btn btn-primary btn-lg" type="button" @click="createPayment('Eigenverbrauch')">Happylab (Eigenverbrauch)</button>
        </div>
        <div class="col-6 d-grid">
          <button class="btn btn-primary btn-lg" type="button" @click="createPayment('MicroPOS')">Privat (Verkauf)</button>
        </div>
      </div>
    </div>

    <div class="row fixed-bottom" style="margin: 0px 20px 10px 0px;">
      <div class="col-4 d-grid">
        <button @click="clearProducts" @keydown.enter.prevent class="btn btn-danger btn-lg" type="button">Abbrechen</button>
      </div>
      <div class="col-8 d-grid">
        <button @click="setBridgePrice" @keydown.enter.prevent class="btn btn-primary btn-lg" type="button" :disabled="totalPrice === 0">
          {{ formattedTotalPrice }}&nbsp;Bezahlen
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import axios from 'axios';
import { io } from 'socket.io-client';

import BarcodeScanner from './components/BarcodeScanner.vue';
import ProductList from './components/ProductList.vue';

export default {
  components: {
    BarcodeScanner,
    ProductList,
  },
  data() {
    return {
      products: {},
      isLoading: false,
      errorMessage: '',
      errorMessageTimeout: 2000,
      idleTimeout: 60000,
      idtleTimeoutId: null,
      isAdminPanelVisible: false,
      showThankYouMessage: false,
      isAdminMode: false,
    };
  },

  async created() {
    try {
      const config = await axios.get('config.json');
      this.isAdminMode = config.data.adminMode;
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  },

  computed: {
    totalPrice() {
      // Assumes this.products is an object where keys are SKUs and values are product objects
      return Object.values(this.products).reduce((sum, product) => sum + (product.price_including_tax * product.amount), 0);
    },
    formattedTotalPrice() {
      return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(this.totalPrice);
    },
    isProductListEmpty() {
      // Assuming your product list is an object where keys are SKUs
      return (!this.showThankYouMessage && Object.keys(this.products).length === 0);
    }
  },
  
  mounted() {
    window.addEventListener('mousemove', this.resetIdleTimeout);
    window.addEventListener('keydown', this.resetIdleTimeout);
    window.addEventListener('click', this.resetIdleTimeout);

    // Start the idle timeout
    this.resetIdleTimeout();

    this.socket = io('http://localhost:3000');
    this.socket.on('payment successful', () => {
      console.log('Payment was successful');
      
      // Handle successful payment here...
      this.showThankYouMessage = true;
      this.isAdminPanelVisible = false;

      this.clearProducts();

      setTimeout(() => {
        this.showThankYouMessage = false;
      }, 5000);
    });

    this.socket.on('admin panel', (data) => {
      this.isAdminPanelVisible = true;
      // Handle any data received
      console.log(data);
    });


  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.resetIdleTimeout);
    window.removeEventListener('keydown', this.resetIdleTimeout);
    window.removeEventListener('click', this.resetIdleTimeout);

    // Clear idle timeout
    clearTimeout(this.idleTimeoutId);

    if (this.socket) {
      this.socket.disconnect();
    }
  },

  methods: {
    resetIdleTimeout() {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = setTimeout(() => {
        //console.log("IDLE TIMEOUT");
        this.clearProducts();
        
        // reload browser
        window.location.reload();
      }, this.idleTimeout);
    },

    async fetchProduct(barcode) {
      console.log("read barcode " + barcode);

      //console.log("Produkte vor fetch products");
      //console.log(this.products);

      this.isLoading = true;
      await axios.get('http://localhost:3000/products', {
        params: {
          barcode: barcode,
        },
        timeout: 5000
      })
      .then(response => {
        console.log("got response");
        if (!this.products[response.data.sku]) {
          var newProduct = response.data;
          newProduct.amount = 1;
          this.products[response.data.sku] = newProduct;
          //this.products = { ...this.products, [response.data.sku]: newProduct };
        } else {
          this.products[response.data.sku].amount += 1;
          this.products[response.data.sku].price += response.data.price;
        }
        //console.log("Produkte vor set Bridge Price");
        //console.log(this.products);
        this.setBridgePrice();
        this.isLoading = false;
        this.errorMessage = ''; // clear error message if successful
      })
      .catch(error => {
        console.log(error);
        this.isLoading = false;
        this.errorMessage = 'Product not found';
        setTimeout(() => {
          this.errorMessage = '';
        }, this.errorMessageTimeout);
      });
    },

    removeProduct(sku) {
      delete this.products[sku];
      //this.products = { ...this.products };
      this.setBridgePrice();
    },

    updateProductAmount({ sku, amount }) {
      // Update the product amount here
      this.products[sku].amount = amount;

      this.setBridgePrice();
    },
    
    clearProducts() {
      //console.log("CLEAR PRODUCTS");
      if (this.products) {
        this.products = {};
        this.setBridgePrice();
      }

      this.isAdminPanelVisible = false;
    },

    async setBridgePrice() {
      try {
        const response = await axios.post('http://localhost:3000/bridge', {
          productList: this.products
        });

        // Here, you could check the response and perform any necessary actions
        console.log(response.data);
      } catch (error) {
        console.error('Error setting bridge price:', error);
      }
    },

    createPayment(type) {
      axios.post('http://localhost:3000/createpayment', { type })
        .then(response => {
          console.log(response.data);
          // Handle successful response
        })
        .catch(error => {
          console.error(error);
          // Handle error
        });
    },

  },
};
</script>

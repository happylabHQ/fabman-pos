<template>

  <table id="tableID" class="table align-middle">
    <thead>
      <tr>
        <th>Anzahl</th>
        <th>Name</th>
        <th>Preis</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(product, sku) in products" :key="sku">
        <td class="text-nowrap">
          <button type="button" class="btn btn-outline-primary btn-lg me-2" v-if="isAdminMode" @click="decrementProduct(sku, product)">-</button>
          {{ product.amount }}
          <button type="button" class="btn btn-outline-primary btn-lg ms-2" v-if="isAdminMode" @click="incrementProduct(sku, product)">+</button>
        </td>
        <td>{{ product.variant_name }}</td>
        <td>{{ new Intl.NumberFormat("de-DE", {style: "currency", currency: "EUR"}).format(product.amount * product.price_including_tax) }}</td>
        <td>
          <button @click="emitRemoveProduct(sku)" type="button" class="btn btn-danger btn-lg btnDelete"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path></svg></button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  props: {
    products: {
      type: Object,
      default: () => ({}),
    },
    isAdminMode: Boolean
  },

  methods: {
    emitRemoveProduct(sku) {
      this.$emit('remove-product', sku);
    },

    incrementProduct(sku, product) {
      this.$emit('update-product-amount', { sku, amount: product.amount + 1 });
    },

    decrementProduct(sku, product) {
      this.$emit('update-product-amount', { sku, amount: product.amount - 1 });
    }
  },
};
</script>

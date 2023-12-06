require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
//const io = new Server(server);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const path = require('path');

const port = 3000;

app.use(cors());
app.use(express.json());

var num = 1;

let bridgePriceSetAt;
let pollingIntervalId;

let productList = null;
let resourceLog = null;

let bridgeData = null;

// Serve static files from the Vue app
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/products', async (req, res) => {
  const barcode = req.query.barcode;
  console.log("search for " + barcode);

  try {
    const options = {
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + process.env.VEND_API_KEY
      }
    };

    const response = await axios.get(`${process.env.VEND_API_URL}/api/2.0/search?type=products&sku=${barcode}`, options);
  
    if (response.data.total_count > 0) {
      // additional API call to get tax_id
      const productDetails = await axios.get(`${process.env.VEND_API_URL}/api/3.0/products/${response.data.data[0].id}`, options);
      //console.log(productDetails.data.data);

      let taxId;

      if (!productDetails.data.data.variants || productDetails.data.data.variants.length === 0) {
        // Check if price_standard and tax_id exist before assigning
        if (productDetails.data.data.price_standard && productDetails.data.data.price_standard.tax_id) {
            taxId = productDetails.data.data.price_standard.tax_id;
        }
      } 
      else {
          // Find the variant with the matching id
          const variant = productDetails.data.data.variants.find(v => v.id === response.data.data[0].id);
      
          // Check if price_standard and tax_id exist in the found variant before assigning
          if (variant && variant.price_standard && variant.price_standard.tax_id) {
              taxId = variant.price_standard.tax_id;
          }
      }

      if (taxId !== undefined) {
        response.data.data[0].tax_id = taxId;

        // additional API call to get tax information
        const taxDetails = await axios.get(`${process.env.VEND_API_URL}/api/taxes/${response.data.data[0].tax_id}`, options);
        response.data.data[0].tax_rate = taxDetails.data.tax.rate;
      } 
      else {
          // Handle case where tax_id is not found
          console.log("Tax ID not found");
      }

      res.json(response.data.data[0]);
    } 
    else {
      res.status(404).json({ message: 'Product not found' });
    }
  } 
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

app.post('/bridge', (req, res) => {
  productList = req.body.productList;
  
  //console.log(productList);

  if (!productList) {
    return res.status(400).send('No product list provided');
  }

  // Calculate total price
  let price = 0;
  Object.values(productList).forEach(product => {
    price += product.price_including_tax * product.amount;
  });

  const sendResponse = (data) => {
    res.json(data);
    res.end();
  };

  // If the price is 0, stop polling and clear the bridgePriceSetAt variable
  if (price === 0) {
    console.log("cleared");
    clearInterval(pollingIntervalId);
    bridgePriceSetAt = null;
    fabmanSetDisplay("Zahlungsterminal");
    
    sendResponse({ status: "Polling started" });
    return;
  }

  // display on bridge
  fabmanSetDisplay("EUR " + price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Bezahlen");

  // Set bridgePriceSetAt to the current date and time
  bridgePriceSetAt = new Date();

  // Clear any existing polling interval and ongoing request
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }

  const pollInterval = 1000;

  // Start the polling interval
  pollingIntervalId = setInterval(() => {
    axios.get(`${process.env.FABMAN_API_URL}/api/v1/resource-logs`, {
      params: {
        resource: process.env.FABMAN_RESOURCE_ID,
        status: 'all',
        type: 'allowed',
        order: 'desc',
        resolve: 'member',
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${process.env.FABMAN_API_KEY}`,
      },
    })
    .then(response => {
      //console.log(response.data);
      console.log("Polled..." + price);
      if (response.data.length > 0) {
        const latestEntry = response.data[0];
        const stoppedAt = new Date(latestEntry.stoppedAt);

        if (stoppedAt >= bridgePriceSetAt) {
          console.log('Payment detected');

          // save resourceLog
          resourceLog = latestEntry;

          // Fetch member privileges
          axios.get(`${process.env.FABMAN_API_URL}/api/v1/members/${resourceLog.member.id}/privileges`, {
            headers: {
              Authorization: `Bearer ${process.env.FABMAN_API_KEY}`,
            },
          })
          .then(response => {
            console.log('Member privileges:', response.data);
            // Do something with privileges data...

            if (response.data.privileges == "member") {
              createPayment("MicroPOS");              
            }
            else {
              io.emit('admin panel');
            }
          })
          .catch(error => {
            console.error('Error fetching member privileges:', error);
          });

          // Stop polling
          clearInterval(pollingIntervalId);          
        }
      }
    })
    .catch(error => {
      console.error('Error polling Fabman API:', error);
    });
  }, pollInterval);

  sendResponse({ status: "Polling started" });

  // If there's no response within 30 seconds, send an empty response
  /*setTimeout(() => {
    clearInterval(pollingIntervalId);
    sendResponse({ status: "No payment yet" });
  }, 30000);*/
});

const createPayment = (paymenttype) => {
  console.log("create payment for type " + paymenttype);

  closeVendSale(paymenttype);

  if (paymenttype != "Eigenverbrauch") {
    closeFabmanSale(productList, resourceLog);
  }

  productList = null;
  resourceLog = null;

  fabmanSetDisplay("Zahlungsterminal");

  io.emit('payment successful');
};

app.post('/createpayment', (req, res) => {
  const paymenttype  = req.body.type;
  
  createPayment(paymenttype);
  //res.send('Payment created');
});

// Handles any requests that don't match the ones above
app.get('*', (req,res) =>{
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log('Server is running on port 3000');
});

async function fabmanSetDisplay(text) {
  try {
    // Fetch resource details
    const getResourceResponse = await axios.get(`${process.env.FABMAN_API_URL}/api/v1/resources/${process.env.FABMAN_RESOURCE_ID}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.FABMAN_API_KEY}`
      }
    });

    bridgeData = getResourceResponse.data; 

    // Update resource
    const updateResponse = await axios.put(`${process.env.FABMAN_API_URL}/api/v1/resources/${process.env.FABMAN_RESOURCE_ID}`, {
      lockVersion: getResourceResponse.data.lockVersion,
      displayTitle: text
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FABMAN_API_KEY}`
      }
    });

    return updateResponse.data;
  } catch (error) {
    console.error(error);
  }
}

function closeVendSale(saleType = "MicroPOS", status = "CLOSED") {
  let totalCost = 0;
  let productPayload = [];

  for (let product of Object.values(productList)) {
      productPayload.push({
        product_id: product.id,
        quantity: product.amount,
        price: product.price_excluding_tax,
        tax: product.price_including_tax - product.price_excluding_tax,
        tax_id: product.tax_id //process.env.TAX_ID,
      });
      totalCost += product.amount * product.price_including_tax;
  }

  let paymentPayload = null;

  if (saleType === "MicroPOS") {
    paymentPayload = [{
      register_id: process.env.REGISTER_ID,
      retailer_payment_type_id: process.env.PAYMENT_TYPE_MICROPOS,
      amount: totalCost,
    }];
  } else if (saleType === "Eigenverbrauch") {
    paymentPayload = [{
      register_id: process.env.REGISTER_ID,
      retailer_payment_type_id: process.env.PAYMENT_TYPE_EIGENVERBRAUCH,
      amount: totalCost,
    }];
  }

  const payload = {
    register_id: process.env.REGISTER_ID,
    user_id: process.env.USER_ID,
    status: status,
    register_sale_products: productPayload,
    note: `Customer: ${resourceLog.member.firstName} ${resourceLog.member.lastName} (${resourceLog.member.memberNumber})`,
    register_sale_payments: paymentPayload,
  };

  //console.log(payload);

  axios.post(`${process.env.VEND_API_URL}/api/register_sales`, payload, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.VEND_API_KEY}`,
    },
  })
  .then(response => {
    //console.log(response.data);
  })
  .catch(error => {
    console.error('Error while closing sale:', error);
  });
}

const closeFabmanSale = async (productList, resourceLog) => {
  try {
    for (let product of Object.values(productList)) {
      let payload = {
        member: resourceLog.member.id,
        dateTime: new Date().toISOString().slice(0, 19),
        description: `${bridgeData.name}: ${product.amount}x ${product.name} \xe1 ${new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR"
        }).format(product.price_including_tax)}`,
        price: product.amount * product.price_including_tax,
        taxPercent: (product.tax_rate*100),
        resourceLog: resourceLog.id
      };

      //console.log(payload);

      const response = await axios.post(`${process.env.FABMAN_API_URL}/api/v1/charges`, payload, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': `Bearer ${process.env.FABMAN_API_KEY}`
        }
      });

      //console.log(response.data);
    }
  } catch (error) {
    console.error(error);
  }
}
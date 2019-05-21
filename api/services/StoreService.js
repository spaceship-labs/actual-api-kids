var Promise = require('bluebird');
var _ = require('underscore');

module.exports = {
	generateStoreCashReportBySellers: generateStoreCashReportBySellers,
	generateStoresCashReport: generateStoresCashReport,
  generateMagerCashReprot: generateMagerCashReprot,
  isWebStore: isWebStore
};

function generateStoresCashReport(params){
  params.populateOrders = false;

	return Store.find({})
		.then(function(stores){
			return Promise.mapSeries(stores,function(store){
        return getPaymentsByStore(store.id, params)
          .then(function(storePayments){
            store = store.toObject();
            store.Payments = storePayments;
            return store;
          });
			});
		})
		.then(function(mappedStores){
			return mappedStores;
		});
}

function getPaymentsByStore(storeId, params){
  var startDate = params.startDate || new Date();
  var endDate = params.endDate || new Date();
  var queryPayments = {};

  return getStoreSellers(storeId)
    .then(function(sellers){
      queryPayments.or = sellers.reduce(function(acum, seller){
        var query = {
          User: seller.id,
          createdAt: { '>=': startDate, '<=': endDate },
          Store: storeId
        };
        acum.push(query);
        return acum;
      }, []);

      return Payment.find(queryPayments);
    });
}

function getStoreSellers(storeId){
  return Role.findOne({name:'seller'})
    .then(function(sellerRole){
      var sellerRoleId = sellerRole.id;
      return User.find({mainStore: storeId, role: sellerRoleId});
    });
}

function generateMagerCashReprot(params){
  var userId = params.userId;

  return User.findOne({id:userId}).populate('Stores')
    .then(function(user){
      var stores = user.Stores;

      return Promise.mapSeries(stores ,function(store){
        var storeParams = _.extend(params,{
          id: store.id
        });
        return generateStoreCashReportBySellers(storeParams)
          .then(function(results){
            store = store.toObject();
            
            if(isWebStore(store.id)){
              store.PaymentsWeb = results;
            }else{
              store.Sellers = results;
            }

            return store;
          });

      });
    });
  }

function generateStoreCashReportBySellers(params){
  var storeId = params.id;
  var startDate = params.startDate || new Date();
  var endDate = params.endDate || new Date();
  var populateOrders = params.populateOrders;

  if(isWebStore(storeId)){
    var query = {
      createdAt: { '>=': startDate, '<=': endDate },
      Store: storeId,
      status: {'!':'canceled'}
    };    
    return PaymentWeb.find(query).populate('OrderWeb');
  }

  return getStoreSellers(storeId)
    .then(function(sellers){
      return Promise.mapSeries(sellers,function(seller){
        var options = {
          seller: seller, 
          startDate: startDate, 
          endDate: endDate, 
          storeId: storeId, 
          populateOrders: populateOrders          
        };

        return getPaymentsBySeller(options);
      });
    })
    .then(function(populatedSellers){
    	return populatedSellers;
    });
}

function getPaymentsBySeller(options){
  var seller = options.seller;
  var startDate = options.startDate;
  var endDate = options.endDate;
  var storeId = options.storeId;
  var populateOrders = options.populateOrders;

  var query = {
    User: seller.id,
    createdAt: { '>=': startDate, '<=': endDate },
    Store: storeId
  };  

  var findPayments = Payment.find(query);
  if(populateOrders){
    findPayments.populate('Order');
  }

  return findPayments
    .then(function(payments){
      seller = seller.toObject();
      seller.Payments = payments;
      return seller;
    });
}

function isWebStore(storeId){
  var storesIds = [
    '58ab5fa9d21cb61c6ec4473c', //KIDS
    '589b5fdd24b5055c104fd5b8', //STUDIO
    '5876b417d21cb61c6e57db63' //HOME
  ];
  return storesIds.indexOf(storeId) > -1;          
}   
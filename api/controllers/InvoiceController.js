/**
 * InvoiceController
 *
 * @description :: Server-side logic for managing invoices
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  async create(req, res) {
    try {
      const orderId = req.param('order');
      const invoiceFound = await Invoice.findOne({ order: orderId });
      if (invoiceFound) throw new Error('invoice already exists');
      const order = await Order.findOne({ id: orderId })
        .populate('User')
        .populate('Client')
        .populate('Payments')
        .populate('EwalletRecords')
        .populate('Address')
        .populate('Details');
      const fiscalAddress = await FiscalAddress.findOne({
        CardCode: order.Client.CardCode,
        AdresType: ClientService.ADDRESS_TYPE,
      });
      const user = req.user;
      const invoice = await InvoiceService.createInvoice(
        order,
        order.Client,
        fiscalAddress,
        order.Payments,
        order.Details,
        user
      );

      res.ok(invoice);
    } catch (error) {
      console.log('err invoice create', error);
      res.negotiate(error);
    }

    // if (err.error && err.error.message) {
    //   err = new Error(err.error.message);
    //   return res.json(400, err);
    // }
    // if (err.error && err.error.error) {
    //   err = new Error(err.error.error.message);
    //   return res.json(400, err);
    // }
    // if (err.error) {
    //   err = new Error(err.error);
    //   return res.json(400, err);
    // }
  },

  find: function(req, res) {
    var form = req.allParams();
    var order = form.order;
    Invoice.find({ order: order })
      .then(function(order) {
        return res.json(order);
      })
      .catch(function(err) {
        return res.json(400, err);
      });
  },

  send: function(req, res) {
    var form = req.allParams();
    var order = form.order;
    InvoiceService.send(order)
      .then(function(order) {
        return res.json(order);
      })
      .catch(function(err) {
        if (err.error && err.error.message) {
          err = new Error(err.error.message);
          return res.negotiate(err);
        }
        if (err.error && err.error.error) {
          err = new Error(err.error.error.message);
          return res.negotiate(err);
        }
        if (err.error) {
          err = new Error(err.error);
          return res.negotiate(err);
        }
        return res.negotiate(err);
      });
  },

  async remove(req, res) {
    try {
      const id = req.param('id');
      const {
        data: invoice,
        error: error,
      } = await InvoiceService.removeInvoice(id);
      await Invoice.update({ cancelled: true });
      res.ok({ message: 'Factura cancelada' });
    } catch (err) {
      res.negotiate(err);
    }
  },
};

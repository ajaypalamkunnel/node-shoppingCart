var db = require('../config/connection')
var collection = require('../config/collections');
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID;
const { response } = require('express');
const { ObjectId } = require('mongodb');
const Razorpay=require('razorpay');
const { resolve } = require('path');
var instance = new Razorpay({
    key_id: 'rzp_test_2adcxhiCC5GwRG',
    key_secret: 'p9MyLbdTnZcSdNbjoM2bhaDD',
  });

module.exports = {
    // signup password encryption
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })

        })
    },
    //calling this function from login page render
    //this userData argument have the data from the login page this data compare with the data from the database
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                //compare with login page password with the encrypted password from database
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("Login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("login Failed");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    //for add to cart
    addToCart: (proId, userId) => {
        let proObj = {
            item: ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                //console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: ObjectId(userId), 'products.item': ObjectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }

                            }).then(() => {
                                resolve()
                            })

                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: ObjectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    //for add products to cart by aggregation method
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
            console.log(cartItems[0].products);
            resolve(cartItems)
        })
    },
    //for cart badge count
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length

            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        //console.log(cartId,proId);
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart) },
                        {
                            $pull: { products: { item: ObjectId(details.product) } }
                        }
                    ).then((response) => {
                        //    console.log(response);
                        resolve({ removeProduct: true })
                    })

            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }

                    ).then((response) => {
                        resolve({ status: true })

                    })
            }

        })
    },
    getTotalAmount: (userId) => {

        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                },

                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                    }
                }

            ]).toArray()
            //  console.log(total[0].total);
            resolve(total[0].total)
        })

    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            //console.log(order,products,total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: ObjectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                //cart clearing after checkout
               // db.get().collection(collection.CART_COLLECTION).removeOne({user:ObjectId(order.userId)})
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            console.log(cart);
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:ObjectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {_id: ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
              console.log(orderItems);
            resolve(orderItems)
        })

    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                console.log("New order: ",order);
                resolve(order)
              });
            
           
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'p9MyLbdTnZcSdNbjoM2bhaDD');
            hmac.update(details['payment[razorpay_order_id]']+'|'+details[ 'payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details[ 'payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }

            }
            ).then(()=>{
                resolve()
            })
        })
    }


    


}
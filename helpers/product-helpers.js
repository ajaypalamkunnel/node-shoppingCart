var db=require('../config/connection')
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectID;
const { response } = require('express');
const { ObjectId } = require('mongodb');
module.exports={
    addProduct:(product,callback)=>{

       console.log(product);

        db.get().collection('product').insertOne(product).then((data)=>{

          console.log(data);

            callback(data.insertedId)

        })
    },
    getAllProducts:()=>{
        return new Promise (async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
   deleteProduct:(prodId)=>{
       return new Promise((resolve,reject)=>{
        //    console.log(prodId);
        //    console.log(objectId(prodId));
           db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:ObjectId(prodId)}).then((response)=>{
               //console.log(response);
               resolve(response)
           })
       })
   },
   getProductDetails:(prodId)=>{
       return new Promise ((resolve,reject)=>{
           db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(prodId)}).then((product)=>{
               console.log(product);
               resolve(product)
           })
       })
   },
   updateProduct:(prodId,proDetails)=>{
       return new Promise((resolve,reject)=>{
           db.get().collection(collection.PRODUCT_COLLECTION)
           .updateOne({_id:ObjectId(prodId)},{
               $set:{
                   Name:proDetails.Name,
                   Description:proDetails.Description,
                   Price:proDetails.Price,
                   Category:proDetails.Category
               }
           }).then((response)=>{
               resolve()
           })
       })
   }
}
const { response, Router } = require('express');
var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
const verifyLogin=(req,res,next)=>{
  if(req.session.admin.loggedIn){
    next()

  }else{
    res.redirect('/login')
  }
}

/* GET users listing. */
//to show products on view-product page
router.get('/', function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    //console.log(products);
    res.render('admin/view-products', { admin: true, products });
  })
});
//for add product page loading
router.get('/add-product', function (req, res) {
  res.render('admin/add-product', { admin: true })

});
//to take data from add-product form and show it 
router.post('/add-product', (req, res) => {
  // console.log(req.body);
  //console.log(req.files.Image);
  productHelper.addProduct(req.body, (id) => {
    // console.log(id);
    let image = req.files.Image
    image.mv('./public/product-images/' + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/add-product")
      } else {
        console.log(err);
      }

    })


  })
})
//for deleting products
router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/')
  })
 

})
//for editing products
router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product})
  
})
router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let image=req.files.Image
      image.mv('./public/product-images/' + id + ".jpg")

    }
  })
})
router.get('/login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/')
  } else {
    res.render('admin/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
})


module.exports = router;

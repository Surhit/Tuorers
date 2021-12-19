const express=require('express');
const app=express()
const mongoose=require('mongoose');
const methodOverride=require('method-override');
const session=require('express-session');
const flash=require('connect-flash');
const path=require('path');
const Campground=require('./models/campground');
const Review = require('./models/review')
const User=require('./models/user')
const engine = require('ejs-mate');
const passport=require('passport');
const cookieParser=require('cookie-parser');
const LocalStrategy=require('passport-local').Strategy;
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
const { authenticate } = require('passport');
const { findById } = require('./models/review');
app.engine('ejs', engine);



mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex:true,
    useUnifiedTopology:true,
    useFindAndModify: false
});

const db=mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("Database connected");
});
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser('keyboard cat'));
const sessionOptions={secret:'supersecret',resave:false,saveUninitialized:true};
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.success=req.flash('success');
    res.locals.error=req.flash('error');
    next();
})

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let isLoggedIn= (req,res,next)=>{
    req.session.returnTo=req.originalUrl;
    if(!req.isAuthenticated())
    {
        req.flash('error','Login to view this page!!');
        return res.redirect('/login');
    }
    next();
}


app.get("/",(req,res)=>{
    res.redirect('/login');
})

app.get("/campgrounds",isLoggedIn, async (req,res)=>{
  const campgrounds=await Campground.find({});
  res.render('campgrounds/index',{campgrounds});
})
app.get("/campgrounds/new",isLoggedIn, (req,res)=>{
    res.render('campgrounds/new');
})
app.post("/campgrounds/new",isLoggedIn,async(req,res)=>{
    const campground=req.body;
    await Campground.create(campground);
    res.redirect("/campgrounds");
})
app.get("/campgrounds/update/:id",isLoggedIn,async (req,res)=>{
    const {id}=req.params;
    const campground=await Campground.findById(id);
    res.render('campgrounds/update',{campground})
})
app.post("/campgrounds/update/:id",isLoggedIn,async(req,res)=>{
    const {id}=req.params;
    const campground=req.body;
    await Campground.findByIdAndUpdate(id,campground);
    res.redirect("/campgrounds");
})



app.delete('/campgrounds/:id',isLoggedIn,async(req,res)=>{
    const {id}= req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect("/campgrounds");
})

app.get("/campgrounds/:id",isLoggedIn,async (req,res)=>{
    const campground=await Campground.findById(req.params.id).populate('reviews');
    res.render('campgrounds/show',{campground});
})

app.post("/campgrounds/:id/reviews",isLoggedIn,async(req,res)=>{
    const campground=await Campground.findById(req.params.id);
    const review= new Review(req.body.review);
    if(review.body)
    {
        campground.reviews.push(review);
        await review.save();
        await campground.save();
    }    
    res.redirect(`/campgrounds/${campground._id}`);
})

app.delete("/campgrounds/:id/reviews/:reviewId",isLoggedIn,async(req,res)=>{
    const {id,reviewId}=req.params;
    await Review.findByIdAndDelete(reviewId);
    const campground=await Campground.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    res.redirect(`/campgrounds/${campground._id}`);
})

app.get("/register",async(req,res)=>{
    res.render('campgrounds/register');
})

app.post("/register",async(req,res)=>{
    try
    {
        const {email,username,password}=req.body;
        const user=new User({email,username});
        const registeredUser=await User.register(user,password);
       
        req.login(registeredUser,err=>{
            if(err) return next(err);
            var msg1="Welcome to Yelp Camp!!";
            req.flash('success',msg1);
            return res.redirect('/campgrounds');
        });
        
    }
    catch(e){
        var err='Username or Email Id already exists!! Login to Proceed.';
        req.flash('error',err);
        res.redirect('/register');
    }  
})

app.get('/login',(req,res)=>{
    res.render('campgrounds/login');
})

app.post('/login',passport.authenticate('local',{ failureFlash:true , failureRedirect:'/login'}),(req,res)=>{
            const redirectUrl=req.session.returnTo||'/campgrounds';
            req.flash('success','Welcome back to Yelp Camp!!');
            delete req.session.returnTo;
            res.redirect(redirectUrl);     
})

app.get('/logout',(req,res)=>{
    req.logout();
    req.flash('success','Successfully Logged out!');
    res.redirect('/login');
})


app.listen(3000,()=>{
    console.log("Serving at port 3000!!");
})
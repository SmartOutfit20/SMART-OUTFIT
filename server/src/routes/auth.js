import {Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { timingSafeEqual, randomBytes, createHash } from 'node:crypto'
import nodemailer from 'nodemailer'
import {User,Product} from '../models/index.js'
import {requireAuth} from '../middleware/auth.js'
import {isMongoId} from '../config/ids.js'
const router=Router()
const bdPhone=/^01[3-9]\d{8}$/

// One-time, environment-gated bootstrap. It is permanently unavailable after
// the first super_admin account is created.
router.post('/bootstrap-admin',async(req,res,next)=>{try{
 const expected=process.env.ADMIN_BOOTSTRAP_TOKEN||''
 const supplied=String(req.get('x-admin-bootstrap-token')||'')
 if(!expected||!supplied)return res.status(404).json({message:'Admin bootstrap is not enabled'})
 const a=Buffer.from(expected),b=Buffer.from(supplied)
 if(a.length!==b.length||!timingSafeEqual(a,b))return res.status(404).json({message:'Admin bootstrap is not enabled'})
 if(await User.exists({role:'super_admin'}))return res.status(409).json({message:'A Super Admin already exists; bootstrap is permanently closed'})
 const email=String(process.env.SUPER_ADMIN_EMAIL||'').trim().toLowerCase()
 const password=String(process.env.SUPER_ADMIN_PASSWORD||'')
 const name=String(process.env.SUPER_ADMIN_NAME||'SMART OUTFIT Super Admin').trim()
 if(!email||!password||password.length<12)return res.status(503).json({message:'Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters in the service environment'})
 const user=await User.create({name,email,passwordHash:await bcrypt.hash(password,12),role:'super_admin',isActive:true})
 res.status(201).json({message:'Super Admin created. Remove the bootstrap environment variables now; then sign in normally.',user:{id:user.id,name:user.name,email:user.email,role:user.role}})
 }catch(e){next(e)}})

router.get('/wishlist',requireAuth,async(req,res,next)=>{try{
 const user=await User.findById(req.user.sub).select('wishlist').lean()
 if(!user)return res.status(404).json({message:'Account not found'})
 const items=await Product.find({_id:{$in:user.wishlist||[]},isPublished:true}).populate('category','name slug').lean()
 res.json({ids:items.map(item=>String(item._id)),items})
 }catch(e){next(e)}})
router.put('/wishlist/:productId',requireAuth,async(req,res,next)=>{try{
 const productId=String(req.params.productId||'')
 if(!isMongoId(productId))return res.status(400).json({message:'Invalid product ID'})
 if(!await Product.exists({_id:productId,isPublished:true}))return res.status(404).json({message:'Product is not available'})
 const current=await User.findById(req.user.sub).select('wishlist')
 if(!current)return res.status(404).json({message:'Account not found'})
 if((current.wishlist||[]).length>=200&&!current.wishlist.some(id=>String(id)===productId))return res.status(400).json({message:'Wishlist limit reached (200 products).'})
 const user=await User.findByIdAndUpdate(req.user.sub,{$addToSet:{wishlist:productId}},{new:true}).select('wishlist')
 res.json({ids:(user?.wishlist||[]).map(String)})
 }catch(e){next(e)}})
router.delete('/wishlist/:productId',requireAuth,async(req,res,next)=>{try{
 const productId=String(req.params.productId||'')
 if(!isMongoId(productId))return res.status(400).json({message:'Invalid product ID'})
 const user=await User.findByIdAndUpdate(req.user.sub,{$pull:{wishlist:productId}},{new:true}).select('wishlist')
 if(!user)return res.status(404).json({message:'Account not found'})
 res.json({ids:(user.wishlist||[]).map(String)})
 }catch(e){next(e)}})

router.get('/me',requireAuth,async(req,res,next)=>{try{
 const user=await User.findById(req.user.sub).select('-passwordHash -passwordResetTokenHash').lean()
 if(!user)return res.status(404).json({message:'Customer account not found'})
 res.json(user)
 }catch(e){next(e)}})
router.patch('/me',requireAuth,async(req,res,next)=>{try{
 const {name,email,phone,profileImage,defaultAddress}=req.body
 const update={}
 if(name!==undefined){if(String(name).trim().length<2||String(name).trim().length>80)return res.status(400).json({message:'Name must be 2–80 characters'});update.name=String(name).trim()}
 if(email!==undefined)update.email=String(email).trim().toLowerCase()||undefined
 if(phone!==undefined){if(phone&&!bdPhone.test(phone))return res.status(400).json({message:'Enter a valid Bangladesh mobile number'});update.phone=phone||undefined}
 if(profileImage!==undefined){const validUrl=!profileImage||(/^https:\/\//i.test(profileImage)&&profileImage.length<=1000);const validData=!profileImage||(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(profileImage)&&profileImage.length<=1200000);if(!validUrl&&!validData)return res.status(400).json({message:'Profile image must be a valid HTTPS URL or compressed WebP image under 1.2 MB'});update.profileImage=profileImage}
 if(defaultAddress!==undefined)update.defaultAddress={division:String(defaultAddress.division||'').trim(),district:String(defaultAddress.district||'').trim(),upazila:String(defaultAddress.upazila||'').trim(),address:String(defaultAddress.address||'').trim()}
 const user=await User.findByIdAndUpdate(req.user.sub,{$set:update},{new:true,runValidators:true}).select('-passwordHash -passwordResetTokenHash')
 if(!user)return res.status(404).json({message:'Customer account not found'})
 res.json(user)
 }catch(e){next(e)}})
router.post('/register',async(req,res,next)=>{try{
 const {name,email,phone,password}=req.body
 if(!name||!password||(!email&&!phone))return res.status(400).json({message:'Name, password and email or phone are required'})
 if(phone&&!bdPhone.test(phone))return res.status(400).json({message:'Enter a valid Bangladesh mobile number'})
 if(password.length<8)return res.status(400).json({message:'Password must be at least 8 characters'})
 const exists=await User.findOne({$or:[...(email?[{email:email.toLowerCase()}]:[]),...(phone?[{phone}]:[])]})
 if(exists)return res.status(409).json({message:'An account with these details already exists'})
 const user=await User.create({name,email,phone,passwordHash:await bcrypt.hash(password,12)})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.status(201).json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,profileImage:user.profileImage||''}})
 }catch(e){next(e)}})
router.post('/admin-login',async(req,res,next)=>{try{
 const {identity,password}=req.body
 const user=await User.findOne({$or:[{email:String(identity||'').toLowerCase()},{phone:String(identity||'')}]})
 const staffRoles=['super_admin','admin','support','editor','viewer']
 if(!user||!user.isActive||!staffRoles.includes(user.role)||!(await bcrypt.compare(password||'',user.passwordHash)))return res.status(401).json({message:'Invalid admin credentials or this account has no staff access.'})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,profileImage:user.profileImage||''}})
 }catch(e){next(e)}})

router.post('/change-password',requireAuth,async(req,res,next)=>{try{
 const {currentPassword,newPassword}=req.body
 if(typeof newPassword!=='string'||newPassword.length<8||newPassword.length>128)return res.status(400).json({message:'New password must be 8–128 characters'})
 const user=await User.findById(req.user.sub)
 if(!user)return res.status(404).json({message:'Account not found'})
 if(!user.passwordHash||!(await bcrypt.compare(String(currentPassword||''),user.passwordHash)))return res.status(400).json({message:'Current password is incorrect'})
 user.passwordHash=await bcrypt.hash(newPassword,12);await user.save()
 res.json({message:'Password updated successfully'})
 }catch(e){next(e)}})

router.post('/forgot-password',async(req,res,next)=>{try{
 const identity=String(req.body.identity||'').trim().toLowerCase()
 if(!identity)return res.status(400).json({message:'Enter your account email address'})
 const user=await User.findOne({email:identity})
 const generic={message:'If an account exists for that email, a password reset link will be sent.'}
 if(!user)return res.json(generic)
 const host=process.env.SMTP_HOST,port=Number(process.env.SMTP_PORT||587),emailUser=process.env.SMTP_USER,emailPass=process.env.SMTP_PASS,from=process.env.SMTP_FROM||emailUser
 if(!host||!emailUser||!emailPass||!from)return res.status(503).json({message:'Password reset email is not configured yet. Please contact customer support.'})
 const rawToken=randomBytes(32).toString('hex')
 user.passwordResetTokenHash=createHash('sha256').update(rawToken).digest('hex')
 user.passwordResetExpires=new Date(Date.now()+30*60*1000)
 await user.save()
 const base=String(process.env.CLIENT_URL||'').split(',')[0].trim().replace(/\/$/,'')
 if(!base)return res.status(503).json({message:'Password reset link is not configured. Please contact support.'})
 const link=base+'/reset-password?token='+rawToken
 const transporter=nodemailer.createTransport({host,port,secure:port===465,auth:{user:emailUser,pass:emailPass}})
 await transporter.sendMail({from:from,to:user.email,subject:'Reset your SMART OUTFIT password',text:'Use this link within 30 minutes to reset your password: '+link,html:'<p>We received a request to reset your SMART OUTFIT password.</p><p><a href="'+link+'">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>'})
 res.json(generic)
 }catch(e){next(e)}})

router.post('/reset-password',async(req,res,next)=>{try{
 const token=String(req.body.token||''),password=req.body.password
 if(!/^[a-f0-9]{64}$/i.test(token))return res.status(400).json({message:'This reset link is invalid or expired.'})
 if(typeof password!=='string'||password.length<8||password.length>128)return res.status(400).json({message:'Password must be 8–128 characters'})
 const hash=createHash('sha256').update(token).digest('hex')
 const user=await User.findOne({passwordResetTokenHash:hash,passwordResetExpires:{$gt:new Date()}})
 if(!user)return res.status(400).json({message:'This reset link is invalid or expired.'})
 user.passwordHash=await bcrypt.hash(password,12);user.passwordResetTokenHash=undefined;user.passwordResetExpires=undefined;await user.save()
 res.json({message:'Password reset successfully. You can now sign in.'})
 }catch(e){next(e)}})

router.post('/google',async(req,res,next)=>{try{
 const credential=String(req.body.credential||'')
 const clientId=String(process.env.GOOGLE_CLIENT_ID||'')
 if(!clientId)return res.status(503).json({message:'Google sign-in is not configured yet.'})
 if(!credential||credential.length>10000)return res.status(400).json({message:'Google sign-in could not be verified'})
 const verify=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential))
 if(!verify.ok)return res.status(401).json({message:'Google sign-in could not be verified'})
 const claims=await verify.json()
 if(claims.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||Number(claims.exp)*1000<=Date.now()||claims.email_verified!=='true'||!claims.email)return res.status(401).json({message:'Google sign-in could not be verified'})
 const email=String(claims.email).toLowerCase()
 let user=await User.findOne({email})
 if(!user){user=await User.create({name:String(claims.name||email.split('@')[0]).slice(0,80),email,profileImage:String(claims.picture||'').startsWith('https://')?claims.picture:'',passwordHash:await bcrypt.hash(randomBytes(32).toString('hex'),12)})}
 if(!user.isActive||user.role!=='customer')return res.status(403).json({message:'This account cannot sign in as a customer.'})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,profileImage:user.profileImage||''}})
 }catch(e){next(e)}})

router.post('/login',async(req,res,next)=>{try{
 const {identity,password}=req.body
 const user=await User.findOne({$or:[{email:String(identity||'').toLowerCase()},{phone:identity}]})
 if(!user||!user.isActive||!(await bcrypt.compare(password||'',user.passwordHash)))return res.status(401).json({message:'Invalid login credentials'})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role}})
 }catch(e){next(e)}})
export default router

import {Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'node:crypto'
import {User} from '../models/index.js'
import {requireAuth} from '../middleware/auth.js'
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

router.get('/me',requireAuth,async(req,res,next)=>{try{
 const user=await User.findById(req.user.sub).select('-passwordHash').lean()
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
 const user=await User.findByIdAndUpdate(req.user.sub,{$set:update},{new:true,runValidators:true}).select('-passwordHash')
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
router.post('/login',async(req,res,next)=>{try{
 const {identity,password}=req.body
 const user=await User.findOne({$or:[{email:String(identity||'').toLowerCase()},{phone:identity}]})
 if(!user||!user.isActive||!(await bcrypt.compare(password||'',user.passwordHash)))return res.status(401).json({message:'Invalid login credentials'})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role}})
 }catch(e){next(e)}})
export default router

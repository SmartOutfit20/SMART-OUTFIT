import {Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {User} from '../models/index.js'
const router=Router()
const bdPhone=/^01[3-9]\d{8}$/
router.post('/register',async(req,res,next)=>{try{
 const {name,email,phone,password}=req.body
 if(!name||!password||(!email&&!phone))return res.status(400).json({message:'Name, password and email or phone are required'})
 if(phone&&!bdPhone.test(phone))return res.status(400).json({message:'Enter a valid Bangladesh mobile number'})
 if(password.length<8)return res.status(400).json({message:'Password must be at least 8 characters'})
 const exists=await User.findOne({$or:[...(email?[{email:email.toLowerCase()}]:[]),...(phone?[{phone}]:[])]})
 if(exists)return res.status(409).json({message:'An account with these details already exists'})
 const user=await User.create({name,email,phone,passwordHash:await bcrypt.hash(password,12)})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.status(201).json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role}})
 }catch(e){next(e)}})
router.post('/login',async(req,res,next)=>{try{
 const {identity,password}=req.body
 const user=await User.findOne({$or:[{email:String(identity||'').toLowerCase()},{phone:identity}]})
 if(!user||!user.isActive||!(await bcrypt.compare(password||'',user.passwordHash)))return res.status(401).json({message:'Invalid login credentials'})
 const token=jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})
 res.json({token,user:{id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role}})
 }catch(e){next(e)}})
export default router

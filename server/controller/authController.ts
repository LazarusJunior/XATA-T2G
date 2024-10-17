import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken'
import { getXataClient } from '../xata';
import AppError from '../utils/AppError';
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config();

const xata = getXataClient();
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            return next(new AppError('Please provide name, email, and password', 400));
        }

        if(req.body.password !== req.body.passwordConfirm) {
            return next(new AppError('Passwords do not match', 400));
        }

        req.body.passwordConfirm = undefined;

        // hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        req.body.password = hashedPassword;

        const user = await xata.db.Users.create(req.body);

        if (!user) {
            return next(new AppError('Failed to create user', 500));
        }

        // Assign JWT token
        const token = jwt.sign({ id: user.xata_id }, process.env.JWT_SECRET!, { expiresIn: '10d' });

        res.status(201).json({
            status: 'success',
            token,
            data: user
        });
    } catch (error) {
        console.error(error);
        return next(new AppError('Failed to create user', 500));
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { email, password } = req.body;

        if(!email || !password) {
            return next(new AppError('Please provide email and password', 400));
        }

        // get user by email, including password for comparison
        const user = await xata.db.Users.filter({ email }).select(['name', 'password', 'role', 'xata_id']).getFirst();

        if(!user){
            return next(new AppError('User not found', 401));
        }

        // compare password if they match
        const match = await bcrypt.compare(password, user.password);

        if(!match){
            return next(new AppError('Invalid credentials', 401));
        }

        // Assign JWT token
        const token = jwt.sign({ id: user.xata_id }, process.env.JWT_SECRET!, { expiresIn: '10d' });

        res.status(200).json({
            status:'Logged in successfully',
            token,
            data: user
        });

    } catch (error) {
        console.error(error);
        return next(new AppError('Failed to create user', 500));
    }
};
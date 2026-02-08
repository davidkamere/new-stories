"use client"

import { useState } from 'react';
// import { getUser, signIn } from "../../api/auth/route";
import { useRouter } from 'next/navigation';
import { supabaseClient } from "@/utils/db/supabase"
import Link from 'next/link';
import Image from 'next/image';

import { motion } from 'framer-motion';

const SignInPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = supabaseClient
    const router = useRouter();

    const handleEmailChange = (e: any) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: any) => {
        setPassword(e.target.value);
    };

    const handleSignIn = async (e: any) => {
        e.preventDefault();

        const emailValue = email.trim();
        const passwordValue = password.trim();

        if (!emailValue || !passwordValue) {
            setError('Email and password are required.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailValue,
                password: passwordValue
            });

            if (error) {
                setError(error.message);
                return;
            }

            const session = data?.session ?? (await supabase.auth.getSession()).data.session;
            if (!session) {
                setError('Login succeeded but no session was created. Please try again.');
                return;
            }

            setError('');
            // Redirect to home on success
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Error during sign-in:', error);
            setError('An error occurred during sign-in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div  className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-400 rounded flex md:flex-row md:space-x-10 justify-center items-center md:p-5">
            <motion.div 
                initial={{ opacity: 0, x: -100 }} // Initial state for the logo, hidden and translated 100px to the left
                animate={{ opacity: 1, x: 0 }} // Animation when component is visible
                transition={{ duration: 0.5 }} // Animation duration
                className="hidden md:block" // Apply styles for the logo container
            >
                <Image src={"/logo.jpeg"} alt="logo" width={350} height={350} priority={true} className='hidden md:block'/>
            </motion.div>
            <motion.form 
                initial={{ opacity: 0, x: 100 }} // Initial state for the form, hidden and translated 100px to the right
                animate={{ opacity: 1, x: 0 }} // Animation when component is visible
                transition={{ duration: 0.5, delay: 0.2 }} // Animation duration with a delay
                className="border rounded-lg px-10 md:px-24 py-10 flex flex-col items-center justify-center "
                onSubmit={handleSignIn}
            >
            
            <>
                <div className="flex flex-col space-y-8 mt-6 md:w-full">
                    <div className="flex flex-col space-y-2">
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={handleEmailChange}
                            placeholder="Email Address"
                            className="p-3 bg-white rounded-lg ring-[#7c7c7c] ring-opacity-50 focus:ring-[#1e90ff] focus:ring-opacity-50"
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={handlePasswordChange}
                            placeholder="Password"
                            className="p-3 bg-white rounded-lg ring-[#7c7c7c] ring-opacity-50 focus:ring-[#1e90ff] focus:ring-opacity-50"
                            required
                        />
                    </div>
                </div>
                {error && <div className="text-red-500 mt-2">{error}</div>}
                <div className="mt-7 md:w-full">
                    <button
                        type="submit"
                        className="border border-black  p-4 w-full font-black rounded-lg py-2 px-4 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out"
                    >
                        {!loading ? <span>Login</span> : <span>Logging in....</span>}
                    </button>
                </div>
                
                <div className="text-center mt-5">
                    Don&apos;t have an account? <Link href="/signUp" className="text-[#1242c4]">Sign Up</Link>
                </div>
            </>
            </motion.form>
        </div>
    );
}

export default SignInPage;

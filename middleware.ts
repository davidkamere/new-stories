import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const currentUser =  request.headers.get('cookie')

    let cookieFound = false

    // console.log('currentUser' ,currentUser)
    if (currentUser) {
        const cookies = currentUser.split(';').map(cookie => cookie.trim());
    
        for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map(part => part.trim());
    
            if (name === 'sb-tlfutomiqalbgqvbfmjk-auth-token-code-verifier' || name === 'sb-tlfutomiqalbgqvbfmjk-auth-token') {
                cookieFound = true;
                break
            }
        }
    } else {
        // Handle the case where currentUser is null or undefined
        console.error('currentUser is null or undefined');
    }

    if((request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/about' || request.nextUrl.pathname.startsWith('/room/')   ) &&  !cookieFound) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.rewrite(url)
    }

    if(request.nextUrl.pathname === '/login' &&  cookieFound) {
        
        return NextResponse.redirect(new URL('/', request.url))
    }
}


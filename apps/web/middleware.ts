import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hàm giải mã JWT cơ bản chạy được trên Edge Runtime
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Giải mã payload
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value
  const accessToken = request.cookies.get('accessToken')?.value
  const { pathname } = request.nextUrl

  // 1. CHƯA LOGIN (Không có refreshToken)
  if (!refreshToken) {
    // Public routes
    if (
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/locked'
    ) {
      return NextResponse.next()
    }


    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // 2. ĐÃ LOGIN (Có refreshToken)

  // Kiểm tra nếu thiếu accessToken thì thử refresh ngay tại middleware (Silent Refresh)
  if (!accessToken) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_CORE_URL || 'http://localhost:3000'
    try {
      const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Cookie': `refreshToken=${refreshToken}`
        }
      })

      if (res.ok) {
        // Lấy tokens mới từ Set-Cookie header
        // getSetCookie() trả về mảng các chuỗi Set-Cookie
        const setCookieHeaders = typeof res.headers.getSetCookie === 'function'
          ? res.headers.getSetCookie()
          : [res.headers.get('set-cookie')].filter(Boolean) as string[]

        // Tạo response mới để tiếp tục hành trình
        const response = NextResponse.next()

        // Đồng bộ cookies mới vào response gửi về browser
        setCookieHeaders.forEach(cookieStr => {
          response.headers.append('Set-Cookie', cookieStr)
        })

        // Quan trọng: Đồng bộ cookies vào request hiện tại để Server Components nhìn thấy tokens mới
        // Chúng ta cần parse set-cookie headers để lấy giá trị mới
        let newAccessToken = ''
        let newRefreshToken = refreshToken // fallback

        setCookieHeaders.forEach(str => {
          if (str.startsWith('accessToken=')) {
            newAccessToken = str.split(';')[0].split('=')[1]
          }
          if (str.startsWith('refreshToken=')) {
            newRefreshToken = str.split(';')[0].split('=')[1]
          }
        })

        if (newAccessToken) {
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('Cookie', `accessToken=${newAccessToken}; refreshToken=${newRefreshToken}`)

          // Trả về response với request headers đã được cập nhật
          const finalResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })

          // Copy Set-Cookie headers sang finalResponse
          setCookieHeaders.forEach(cookieStr => {
            finalResponse.headers.append('Set-Cookie', cookieStr)
          })

          return finalResponse
        }
      }
    } catch (error) {
      console.error('Middleware silent refresh failed:', error)
    }

    // Nếu refresh thất bại hoặc không có accessToken mới, xoá token cũ và redirect về login (trừ trang public)
    if (
      pathname !== '/' &&
      pathname !== '/login' &&
      pathname !== '/register' &&
      pathname !== '/locked'
    ) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('refreshToken')
      response.cookies.delete('accessToken')
      return response
    }
  }

  const decodedToken = decodeJwtPayload(refreshToken)
  const userRole = decodedToken?.role || 'CLIENT'


  // Nếu đã login mà cố vào login/register
  if (pathname === '/login' || pathname === '/register') {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect admin routes
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// 5. Cấu hình matcher
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
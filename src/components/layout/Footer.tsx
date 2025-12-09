import { Mail, Phone, MapPin, Facebook, Linkedin, Instagram, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <img src="/logo.svg" alt="DeRent5" className="h-8 w-auto mb-4" />
            <p className="text-gray-600 text-sm mb-4">
              Modern rental management platform for property owners and tenants.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-600 hover:text-teal-600">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-600 hover:text-teal-600">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-600 hover:text-teal-600">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-600 hover:text-teal-600">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Browse Properties
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  List Property
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  My Account
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-teal-600">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <Phone size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">(225) 656-7890</span>
              </li>
              <li className="flex gap-2">
                <Mail size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">support@derent5.com</span>
              </li>
              <li className="flex gap-2">
                <MapPin size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">123 Main St, City, Country</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-600">
            &copy; {new Date().getFullYear()} DeRent5. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-gray-900">{{projectName}}</span>
            </div>
            <p className="text-gray-600 text-sm max-w-sm">
              Build something amazing with our powerful tools and services. Start your journey today.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Features</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Pricing</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Documentation</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">About</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Blog</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} {{projectName}}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

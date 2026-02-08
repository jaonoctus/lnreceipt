export default defineNuxtRouteMiddleware((to) => {
  // Only run on client-side
  if (process.server) return

  // Check if we have the old query param format
  if (to.query.invoice && to.query.preimage) {
    const invoice = encodeURIComponent(to.query.invoice as string)
    const preimage = encodeURIComponent(to.query.preimage as string)
    return navigateTo(`/${invoice}/${preimage}`, { replace: true })
  }
})

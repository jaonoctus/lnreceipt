export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  if (to.query.invoice && to.query.preimage) {
    const invoice = encodeURIComponent(to.query.invoice as string)
    const preimage = encodeURIComponent(to.query.preimage as string)
    return navigateTo(`/${invoice}/${preimage}`, { replace: true })
  }
})

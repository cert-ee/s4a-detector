export default function ({ store, route, redirect }) {
    if (store.state.setupDone) {
        if (route.path === '/setup') return redirect('/');
    } else {
        if (route.path === '/setup') return;
        return redirect('/setup');
    }
}
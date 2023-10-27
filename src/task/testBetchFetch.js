var urls = [
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "A"}},
    {url: "https://api.ctblock.cn/api/private/dashboard", formdata: {A: "B"}}
];
Promise.all(urls.map(url =>
    fetch(url.url, {
        method: "POST",
        redirect: "follow",
        timeout: 5000
    }).then(resp => {
        return resp.json()
    }).then(ret => {
        return {...url, result: ret}
    })
)).then(texts => {
    console.log(texts);
});

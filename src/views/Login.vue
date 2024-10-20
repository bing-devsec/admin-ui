<template>
    <div id="app">
        <div class="content">
            <div class="content_input">
                <div class="title">
                    <p>管理员登录</p>
                </div>

                <el-input v-model="UserName" clearable type="text" size="large" placeholder="用户名"></el-input>
                <el-input v-model="PassWord" clearable type="password" size="large" placeholder="密码"></el-input>

                <div class="content_button" style="margin-bottom: 25px">
                    <el-button type="primary" @click="SignIn">登录</el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Ribbons from "../utils/ribbon.js";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

export default {
    setup() {
        const router = useRouter();

        const UserName = ref("");
        const PassWord = ref("");
        const accessToken = localStorage.getItem("accessToken");
        const SignIn = () => {
            //登录
            if (!UserName.value && !PassWord.value) {
                alert("用户名或密码不能为空");
                return;
            }

            const data = {
                username: UserName.value,
                password: PassWord.value,
            };

            window.$axios
                .post("/admin/login", data, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })
                .then(function (response: { data: { Code: any; UserId: any }; }) {
                    let code = response.data.Code;
                    if (code === 1000) {
                        alert("用户名或密码错误");
                    } else {
                        //登录成功
                        const user_id = response.data.UserId;
                        localStorage.setItem("user_id", user_id);
                        Ribbons.stop();
                        router.push("/home/manageDocument");
                    }
                })
                .catch(function (error: any) {
                    if (error.response && error.response.status === 401) {
                        router.push("/").then(() => {
                            // 访问令牌过期，尝试使用刷新令牌获取新的访问令牌
                            const refreshToken = localStorage.getItem("refreshToken");

                            if (refreshToken) {
                                window.$axios
                                    .post("/admin/refresh-token", null, {
                                        headers: {
                                            'Authorization': `Bearer ${refreshToken}`
                                        }
                                    })
                                    .then(function (response: { data: { access_token: any; refresh_token: any; UserId: any }; }) {
                                        // 保存新的访问令牌和刷新令牌
                                        const accessToken = response.data.access_token;
                                        const refreshToken = response.data.refresh_token;
                                        const user_id = response.data.UserId;
                                        localStorage.setItem("accessToken", accessToken);
                                        localStorage.setItem("refreshToken", refreshToken);
                                        localStorage.setItem("user_id", user_id);
                                        window.$axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                                        router.push("/home/manageDocument");
                                    })
                                    .catch(function (error: any) {
                                        // 刷新令牌也过期或无效，跳转到短信登录页面
                                        router.push("/short-message-login");
                                    });
                            } else {
                                // 没有刷新令牌，跳转到短信登录页面
                                router.push("/short-message-login");
                            }
                        });
                    } else if (error.response && error.response.status === 403) {
                        router.push("/short-message-login");
                    } else {
                        alert(error);
                    }
                });
        };

        onMounted(() => {
            Ribbons.start();
        });

        return {
            UserName,
            PassWord,
            SignIn,
        };
    },
};
</script>

<style scoped>
@charset "utf-8";

* {
    padding: 0;
    margin: 0;
}

.content {
    width: 500px;
    height: 300px;
    box-sizing: border-box;
    padding: 0 50px;
    border-radius: 5px;
    box-shadow: 0px 2px 12px 0px rgba(105, 105, 105, 0.07);
    background: rgba(255, 255, 255, 0.5);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: mymove 1s ease-in-out alternate;
    overflow: hidden;
    transition: 1.5s;
}

@keyframes mymove {
    0% {
        width: 0px;
        height: 5px;
    }

    10% {
        width: 50px;
        height: 5px;
    }

    15% {
        width: 100px;
        height: 5px;
    }

    20% {
        width: 150px;
        height: 5px;
    }

    25% {
        width: 200px;
        height: 5px;
    }

    30% {
        width: 250px;
        height: 5px;
    }

    35% {
        width: 300px;
        height: 5px;
    }

    40% {
        width: 350px;
        height: 5px;
    }

    45% {
        width: 450px;
        height: 5px;
    }

    50% {
        width: 500px;
        height: 5px;
    }

    55% {
        height: 30px;
    }

    60% {
        height: 60px;
    }

    65% {
        height: 90px;
    }

    70% {
        height: 120px;
    }

    75% {
        height: 150px;
    }

    80% {
        height: 180px;
    }

    85% {
        height: 210px;
    }

    90% {
        height: 240px;
    }

    95% {
        height: 240px;
    }

    100% {
        height: 300px;
    }
}

.content_input {
    width: 300px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.content_button {
    margin-top: 10px;
}

.el-input {
    margin-bottom: 25px;
}

.title {
    text-align: center;
    font-size: 24px;
    margin-bottom: 30px;
    font-weight: bold;
    color: #606266;
}

.el-button--primary {
    width: 100%;
}
</style>

<template>
    <div id="app">
        <div class="content">
            <div class="content_input">
                <div class="title">
                    <p>管理员登录</p>
                </div>

                <el-input v-model="phone" clearable type="text" size="large" placeholder="手机号"></el-input>

                <div class="verification">
                    <el-input class="verification-input" v-model="shortMessageCode" clearable type="password"
                        size="large" placeholder="验证码"></el-input>

                    <el-button class="verification-button" :disabled="!isPhoneValid(phone) || countDown > 0"
                        @click="sendCode">{{ countDown > 0 ?
                    `${countDown} 秒` : '发送验证码' }}</el-button>
                </div>

                <div class="content_button" style="margin-bottom: 25px">
                    <el-button type="primary" @click="SignIn">登录</el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Ribbons from "../utils/ribbon.js";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

export default {
    setup() {
        const router = useRouter();

        const phone = ref("");
        const shortMessageCode = ref("");
        const countDown = ref(0);
        let intervalId = null;

        const isPhoneValid = (phone) => {
            const phoneRegex = /^[1]([3-9])[0-9]{9}$/;
            return phoneRegex.test(phone);
        };

        // 发送验证码
        const sendCode = () => {
            if (isPhoneValid(phone.value)) {
                const data = {
                    phoneNumber: phone.value,
                };

                window.$axios
                    .post("/admin/return-code", data)
                    .then(function (response: { data: { status_code: number; status_message: string } }) {
                        const code = response.data.status_code;
                        if (code === 1005) {
                            countDown.value = 60;
                            intervalId = setInterval(() => {
                                if (countDown.value > 0) {
                                    countDown.value--;
                                } else {
                                    clearInterval(intervalId);
                                }
                            }, 1000);
                        } else {
                            alert(response.data.status_message);
                        }
                    })
                    .catch(function (error: any) {
                        alert("发送验证码失败，请稍后重试");
                        console.error(error);
                    });
            } else {
                alert("请输入有效的手机号码");
            }
        };

        // 手机号登录:返回两个token
        const SignIn = () => {
            //登录
            if (!phone.value && !shortMessageCode.value) {
                alert("手机号和验证码不能为空");
            } else {
                // 待发送的手机号和验证码
                const data = {
                    phone: phone.value,
                    shortMessageCode: shortMessageCode.value,
                };

                window.$axios
                    .post("/admin/short-message-login", data)
                    .then(function (response: { data: { status_code: any; AccessToken: any; RefreshToken: any; UserId: any }; }) {
                        let code = response.data.status_code;
                        //通过后端返回的状态码进行判断用户是否可以登录
                        if (code === 1003) {
                            alert("手机号或验证码错误");
                        } else if (code === 1004) {
                            alert("验证码过期")
                        } else if (code === 1006) {
                            alert("无效的手机号")
                        } else {
                            //登录成功, 保存新的长token和短token
                            const accessToken = response.data.AccessToken
                            const refreshToken = response.data.RefreshToken;
                            const user_id = response.data.UserId;
                            localStorage.setItem("accessToken", accessToken);
                            localStorage.setItem("refreshToken", refreshToken);
                            localStorage.setItem("user_id", user_id);
                            Ribbons.stop();

                            router.push("/home/manageDocument");
                        }
                    })
                    .catch(function (error: any) {
                        alert(error);
                    });
            }
        };

        const phoneAutocomplete = computed(() => {
            return router.currentRoute.value.path === '/short-message-login' ? 'new-phone' : 'phone';
        });

        onMounted(() => {
            Ribbons.start();
        });

        return {
            phone,
            shortMessageCode,
            SignIn,
            sendCode,
            countDown,
            isPhoneValid,
            phoneAutocomplete,
        };
    },
};
</script>

<style scoped>
.verification {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.verification-input {
    width: 50%;
}

.verification-button {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 25px;
}

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

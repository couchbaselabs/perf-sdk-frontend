<template>
  <div class="app">
    <main class="main-layout">
      <!-- Collapsible Navigation Sidebar -->
      <aside class="nav-sidebar" :class="{ collapsed: isNavCollapsed }">
        <div class="sidebar-header">
          <!-- Explorer has bugs so is being (temporarily?) disabled -->
          <router-link to="/" class="navbar-brand" v-if="!isNavCollapsed">
            <span class="logo-text">SDK</span>
            <span class="logo-separator">/</span>
            <span class="logo-subtext">Performance</span>
          </router-link>
          <button class="collapse-btn" @click="toggleNav">
            <span class="material-symbols-outlined">
              {{ isNavCollapsed ? 'menu' : 'menu_open' }}
            </span>
          </button>
        </div>

        <!-- SDK Categories -->
        <div class="sdk-groups">
            <div class="sdk-list">
              <router-link 
                v-for="item in sdkGroups" 
                :key="item.path" 
                :to="item.path" 
                class="nav-link" 
                :class="{ 
                  active: currentPath.startsWith(item.path), 
                  'nav-collapsed': isNavCollapsed 
                }"
              >
                <svg v-if="item.svgPath" 
                     xmlns="http://www.w3.org/2000/svg" 
                     :viewBox="item.viewBox" 
                     class="lang-icon">
                  <path :d="item.svgPath" 
                        :fill="currentPath === item.path ? '#2563eb' : (item.fill || '#64748b')"
                        :fill-opacity="item.fillOpacity || 1"
                        :fill-rule="item.fillRule || 'nonzero'" />
                </svg>
                <span class="sdk-name" v-if="!isNavCollapsed">{{ item.name }}</span>
              </router-link>
            </div>
          </div>

        <!-- Action Links -->
        <div class="sidebar-actions">
          <router-link to="/versus" class="action-button">
            <span class="material-symbols-outlined">bolt</span>
            <span v-if="!isNavCollapsed">Versus</span>
          </router-link>
          <router-link to="/situationalRuns" class="action-button">
            <span class="material-symbols-outlined">monitoring</span>
            <span v-if="!isNavCollapsed">Situational</span>
          </router-link>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="content-area">
        <!-- Charts Grid -->
        <div class="charts-container">
          <div class="charts-grid">
            <router-view v-slot="{ Component }">
              <keep-alive :max="10">
                <component 
                  :is="Component" 
                />
              </keep-alive>
            </router-view>
          </div>
        </div>


      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isNavCollapsed = ref(true)

const toggleNav = () => {
  const newState = !isNavCollapsed.value
  isNavCollapsed.value = newState
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('navState', JSON.stringify(newState))
  }
  console.log('Nav state toggled:', newState) // For debugging
}

const sdkGroups = [
      { 
        name: 'Java', 
        path: '/java',
        viewBox: '0 0 21 28',
        svgPath: 'M13.266 1s2.718 2.703-2.578 6.857c-3.285 2.578-2.069 4.3-.902 5.951.343.485.68.963.9 1.456-2.48-2.223-4.298-4.18-3.078-6.002.596-.89 1.543-1.626 2.501-2.372 1.922-1.495 3.889-3.026 3.157-5.89zm-1.403 12.431c1.263 1.445-.331 2.744-.331 2.744s3.204-1.644 1.733-3.703a46.915 46.915 0 00-.175-.242c-1.278-1.764-2.008-2.772 3.452-5.92 0 0-8.956 2.223-4.679 7.122zm-4.65 7.678s-.998.577.713.772c2.073.236 3.133.202 5.417-.227 0 0 .601.374 1.44.698-5.122 2.18-11.592-.127-7.57-1.244zm-.625-2.847s-1.121.825.591 1.001c2.215.227 3.964.246 6.99-.333 0 0 .419.422 1.076.652-6.191 1.8-13.088.142-8.657-1.32zm11.235 6.028c1.554-.468.815-1.075.815-1.075 2.708 1.215-5.885 3.655-16.326 1.972-3.83-.617 1.842-2.77 2.88-2.044 0 0-.328-.022-.902.101-.55.118-2.3.678-1.368 1.082 2.597 1.122 11.945.854 14.9-.036zM6.01 16.845c-3.07-.409 1.684-1.531 1.684-1.531s-1.847-.124-4.117.967c-2.686 1.29 6.641 1.879 11.47.616.503-.34 1.196-.636 1.196-.636s-1.975.351-3.943.516c-2.409.2-4.993.24-6.29.067zM17.28 15.41c1.584-.328 3.854 2.108-1.055 4.642-.02.055-.084.115-.096.127l-.002.001c6.555-1.712 4.145-6.036 1.011-4.941a.89.89 0 00-.419.321s.174-.07.561-.15zm3.017 9.127c-.172 2.216-7.408 2.681-12.118 2.382-3.096-.198-3.699-.694-3.699-.694 2.941.483 7.902.57 11.923-.182 3.564-.666 3.893-1.506 3.893-1.506z',
        fillRule: 'evenodd'
      },
      { 
        name: 'Kotlin', 
        path: '/kotlin',
        view: '0 0 24 24',
        svgPath: 'M20 21H0V1h20L9.793 10.855 20 21Z',
        fill: '#7F52FF'
      },
      { 
        name: 'Scala', 
        path: '/scala',
        viewBox: '0 0 24 24',
        svgPath: 'M4.589 24c4.537 0 13.81-1.516 14.821-3v-5.729c-1.011 1.495-10.284 2.972-14.821 2.972V24zm0-7.515c4.537 0 13.81-1.516 14.821-3V7.757c-1.011 1.495-10.284 2.972-14.821 2.972v5.756zm0-7.514c4.537 0 13.81-1.516 14.821-3V.243C18.399 1.727 9.126 3.215 4.589 3.215v5.756z',
        fill: '#DC322F'
      },
      { 
        name: 'C++', 
        path: '/cpp',
        viewBox: '0 0 24 27',
        svgPath: 'M23.903 6.639l.067-.043c-.134-.233-.334-.445-.534-.551L12.696.148C12.518.042 12.274 0 12.007 0a1.64 1.64 0 00-.69.148L.646 6.066C.267 6.278 0 6.808 0 7.21v11.814c0 .233.044.488.2.72l-.044.022c.11.17.266.318.422.403l10.718 5.918c.178.106.422.148.689.148.267 0 .511-.064.69-.148l10.672-5.918c.378-.212.645-.742.645-1.145V7.19c.022-.17 0-.36-.089-.551zm-7.893 6.893v-.849h1.111v-1.06h1.112v1.06h1.112v.849h-1.112v1.06h-1.112v-1.06H16.01zm.733-2.97c-.934-1.59-2.712-2.65-4.736-2.65-3.002 0-5.448 2.332-5.448 5.195 0 2.864 2.446 5.197 5.448 5.197 2.024 0 3.802-1.06 4.736-2.63l2.869 1.612c-1.512 2.502-4.358 4.2-7.605 4.2-4.847 0-8.783-3.755-8.783-8.379 0-4.623 3.936-8.377 8.783-8.377 3.269 0 6.115 1.718 7.627 4.242l-2.89 1.59zm6.604 2.97h-1.112v1.06h-.889v-1.06h-1.334v-.849h1.334v-1.06h.89v1.06h1.111v.849z',
        fill: '#25265E',
        fillOpacity: '.4'
      },
      { 
        name: '.NET', 
        path: '/dotnet',
        viewBox: '0 0 456 456',
        defs: '',
        svgPath: 'M81.2738 291.333C78.0496 291.333 75.309 290.259 73.052 288.11C70.795 285.906 69.6665 283.289 69.6665 280.259C69.6665 277.173 70.795 274.529 73.052 272.325C75.309 270.121 78.0496 269.019 81.2738 269.019C84.5518 269.019 87.3193 270.121 89.5763 272.325C91.887 274.529 93.0424 277.173 93.0424 280.259C93.0424 283.289 91.887 285.906 89.5763 288.11C87.3193 290.259 84.5518 291.333 81.2738 291.333ZM210.167 289.515H189.209L133.994 202.406C132.597 200.202 131.441 197.915 130.528 195.546H130.044C130.474 198.081 130.689 203.508 130.689 211.827V289.515H112.149V171H134.477L187.839 256.043C190.096 259.57 191.547 261.994 192.192 263.316H192.514C191.977 260.176 191.708 254.859 191.708 247.365V171H210.167V289.515ZM300.449 289.515H235.561V171H297.87V187.695H254.746V221.249H294.485V237.861H254.746V272.903H300.449V289.515ZM392.667 187.695H359.457V289.515H340.272V187.695H307.143V171H392.667V187.695Z'
      },
      { 
        name: 'Go', 
        path: '/go',
        viewBox: '0 0 40 40',
        svgPath: 'M3.00684 16.739C2.9516 16.739 2.89634 16.6837 2.9516 16.6285L3.33841 16.0759C3.39365 16.0206 3.44891 15.9654 3.55944 15.9654H10.522C10.5772 15.9654 10.6325 16.0206 10.5772 16.0759L10.2457 16.5731C10.1905 16.6285 10.1352 16.6837 10.0247 16.6837L3.00684 16.739ZM0.0781503 18.5072C0.0228897 18.5072 -0.0323709 18.4519 0.0228897 18.3967L0.409701 17.8441C0.464961 17.7888 0.520209 17.7336 0.63073 17.7336H9.52736C9.58262 17.7336 9.63788 17.7888 9.63788 17.8441L9.47211 18.3967C9.47211 18.4519 9.36159 18.5072 9.30633 18.5072H0.0781503ZM4.77513 20.3307C4.71987 20.3307 4.66461 20.2755 4.71987 20.2202L4.99616 19.7229C5.05142 19.6676 5.10668 19.6124 5.21719 19.6124H9.0853C9.14055 19.6124 9.19581 19.6676 9.19581 19.7229L9.14055 20.165C9.14055 20.2202 9.0853 20.2755 9.03004 20.2755L4.77513 20.3307ZM24.9997 16.3521L21.7394 17.181C21.4632 17.2362 21.408 17.2916 21.187 16.96C20.9106 16.6285 20.6896 16.4074 20.2475 16.2416C19.0318 15.6338 17.8161 15.7995 16.711 16.5179C15.3848 17.3468 14.7217 18.6178 14.7217 20.2202C14.7217 21.7674 15.8268 23.0384 17.3741 23.2595C18.7003 23.4252 19.8054 22.9831 20.6896 21.9886C20.8554 21.7674 21.0211 21.5464 21.2422 21.2702H17.4846C17.0977 21.2702 16.9872 20.9938 17.0977 20.6624C17.3741 20.0545 17.8161 19.0598 18.0925 18.5624C18.1477 18.4519 18.3134 18.2309 18.5898 18.2309H25.6628C25.6076 18.7835 25.6076 19.2809 25.5523 19.8334C25.3313 21.215 24.834 22.5412 23.9499 23.6462C22.5684 25.4698 20.7449 26.6303 18.4239 26.9617C16.4899 27.2381 14.7217 26.8512 13.1744 25.6908C11.7377 24.5857 10.9088 23.149 10.6879 21.3807C10.4115 19.2809 11.0746 17.3468 12.3455 15.689C13.727 13.8655 15.5505 12.7051 17.8161 12.3183C19.6396 11.9867 21.408 12.2078 22.9552 13.2576C24.0051 13.9207 24.7235 14.8602 25.2208 16.0206C25.2761 16.2416 25.2208 16.2969 24.9997 16.3521Z',
        fill: '#00ADD8'
      },
      {
        name: 'Python', 
        path: '/python',
        viewBox: '0 0 24 25',
        svgPath: 'M9.091 11.663h5.782c1.61 0 2.877-1.353 2.877-2.96V3.225c0-1.559-1.315-2.73-2.886-2.99A18.088 18.088 0 0011.853 0a16.25 16.25 0 00-2.738.235c-2.45.43-2.866 1.33-2.866 2.99v2.132H12v.788H4.025C2.342 6.145.868 7.152.408 9.064c-.532 2.191-.556 3.531 0 5.82.411 1.702 1.394 2.888 3.076 2.888h1.972V15.2c0-1.9 1.672-3.538 3.635-3.538zm-.364-7.707c-.6 0-1.087-.489-1.087-1.093 0-.606.486-1.1 1.087-1.1.597 0 1.086.494 1.086 1.1a1.09 1.09 0 01-1.086 1.093zm14.83 5.108c-.416-1.665-1.21-2.919-2.895-2.919h-2.118v2.558c0 1.98-1.744 3.551-3.671 3.551H9.091c-1.584 0-2.842 1.444-2.842 3.02v5.479c0 1.558 1.338 2.475 2.868 2.923 1.833.535 3.568.632 5.76 0 1.458-.42 2.873-1.264 2.873-2.923V18.56H12v-.788h8.662c1.682 0 2.31-1.138 2.895-2.89.604-1.801.578-3.506 0-5.818zm-8.32 10.958c.6 0 1.087.488 1.087 1.093 0 .606-.486 1.1-1.087 1.1a1.095 1.095 0 01-1.086-1.1 1.09 1.09 0 011.086-1.093z',
        fillOpacity: '.4'
      },
      { 
        name: 'Node', 
        path: '/node',
        viewBox: '0 0 24 24',
        svgPath: 'M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z',
        fill: '#339933'
      },
      { 
        name: 'Ruby', 
        path: '/ruby',
        viewBox: '0 0 128 128',
        defs: '',
        svgPath: `M35.971 111.33c27.466 3.75 54.444 7.433 81.958 11.188-9.374-15.606-18.507-30.813-27.713-46.144l-54.245 34.956zM125.681 24.947c-2.421 3.636-4.847 7.269-7.265 10.907-8.304 12.493-16.607 24.986-24.903 37.485-.462.696-1.061 1.248-.41 2.321 8.016 13.237 15.969 26.513 23.942 39.777 1.258 2.095 2.53 4.182 4.157 6.192 1.612-32.193 3.223-64.387 4.834-96.58l-.355-.102zM16.252 66.22c.375.355 1.311.562 1.747.347 7.689-3.779 15.427-7.474 22.948-11.564 2.453-1.333 4.339-3.723 6.452-5.661 6.997-6.417 13.983-12.847 20.966-19.278.427-.395.933-.777 1.188-1.275 2.508-4.902 4.973-9.829 7.525-14.898-3.043-1.144-5.928-2.263-8.849-3.281-.396-.138-1.02.136-1.449.375-6.761 3.777-13.649 7.353-20.195 11.472-3.275 2.061-5.943 5.098-8.843 7.743-4.674 4.266-9.342 8.542-13.948 12.882-1.222 1.152-2.336 2.468-3.288 3.854-3.15 4.587-6.206 9.24-9.402 14.025 1.786 1.847 3.41 3.613 5.148 5.259zM44.354 59.949c-3.825 16.159-7.627 32.227-11.556 48.823 18.423-11.871 36.421-23.468 54.3-34.987-14.228-4.605-28.41-9.196-42.744-13.836zM120.985 25.103c-15.566 2.601-30.76 5.139-46.15 7.71 5.242 12.751 10.379 25.246 15.662 38.096 10.221-15.359 20.24-30.41 30.488-45.806zM44.996 56.644c14.017 4.55 27.755 9.01 41.892 13.6-5.25-12.79-10.32-25.133-15.495-37.737-8.815 8.059-17.498 15.999-26.397 24.137zM16.831 75.643c-4.971 11.883-9.773 23.362-14.662 35.048 9.396-.278 18.504-.547 27.925-.825-4.423-11.412-8.759-22.6-13.263-34.223zM30.424 101.739l.346-.076c3.353-13.941 6.754-27.786 10.177-42.272-7.636 3.969-14.92 7.754-22.403 11.644 3.819 9.926 7.891 20.397 11.88 30.704zM115.351 22.842c-4.459-1.181-8.918-2.366-13.379-3.539-6.412-1.686-12.829-3.351-19.237-5.052-.801-.213-1.38-.352-1.851.613-2.265 4.64-4.6 9.245-6.901 13.868-.071.143-.056.328-.111.687 13.886-2.104 27.679-4.195 41.47-6.285l.009-.292zM89.482 12.288l36.343 10.054c-2.084-5.939-4.017-11.446-6.005-17.11l-30.285 6.715-.053.341zM33.505 114.007c-4.501-.519-9.122-.042-13.687.037-3.75.063-7.5.206-11.25.323-.386.012-.771.09-1.156.506 31.003 2.866 62.005 5.732 93.007 8.6l.063-.414c-9.938-1.357-19.877-2.714-29.815-4.07-12.384-1.691-24.747-3.551-37.162-4.982zM2.782 99.994c3.995-9.27 7.973-18.546 11.984-27.809.401-.929.37-1.56-.415-2.308-1.678-1.597-3.237-3.318-5.071-5.226-2.479 12.24-4.897 24.177-7.317 36.113l.271.127c.185-.297.411-.578.548-.897zM81.522 9.841c6.737-1.738 13.572-3.097 20.367-4.613.44-.099.87-.244 1.303-.368l-.067-.332c-9.571 1.287-19.141 2.575-29.194 3.928 2.741 1.197 4.853 2.091 7.591 1.385z'
        `
      }
    ]

const currentPath = computed(() => {
  const path = router.currentRoute.value.path
  // Handle nested routes by checking if current path starts with item path
  return path.endsWith('/') ? path.slice(0, -1) : path
})

onMounted(() => {
  // Load initial nav state from localStorage
  if (typeof localStorage !== 'undefined') {
    const savedState = localStorage.getItem('navState')
    if (savedState !== null) {
      isNavCollapsed.value = JSON.parse(savedState)
    }
  }
})

router.beforeEach((to, from, next) => {
  // Preserve isNavCollapsed state
  if (typeof localStorage !== 'undefined') {
    const savedState = localStorage.getItem('navState')
    if (savedState) {
      isNavCollapsed.value = JSON.parse(savedState)
    }
  }
  next()
})

watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    // Update any necessary sidebar state when route changes
    console.log('Route changed:', newPath)
  }
)
</script>

<style>
@import './styles/theme.css';
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');

:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(37, 99, 235, 0.1);
  --background: #f8fafc;
  --surface: #ffffff;
  --surface-hover: #f1f5f9;
  --text: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}

.main-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100vh;
  background: var(--background);
}

.nav-sidebar {
  background: #0d1723;
  width: 280px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  color: #ffffff;
}

.nav-sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 64px;
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.collapse-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: absolute;
  right: 12px;
}

.collapse-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: #ffffff;
}

.logo-text {
  font-weight: 700;
  font-size: 1.25rem;
  color: #7ca1f3;
}

.logo-separator {
  color: #94a3b8;
}

.logo-subtext {
  color: #ffffff;
  font-weight: 500;
}

.sdk-groups {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.sdk-group {
  margin-bottom: 2rem;
}

.sdk-group-title {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  text-transform: uppercase;
}

.sdk-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}

.lang-icon {
  width: 24px;
  height: 24px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.nav-link {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: 12px 16px;
  color: var(--text-color);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 48px;
  width: 100%;
  position: relative;
}

.nav-sidebar.collapsed .nav-link {
  justify-content: flex-start;
  padding: 12px 0;
}

.nav-sidebar.collapsed .lang-icon {
  margin-right: 0;
}

.nav-sidebar.collapsed .sdk-name {
  display: none;

}

.nav-link svg path {
  fill: currentColor !important;
  fill-opacity: 1 !important;
}

.nav-link:hover .lang-icon path {
  fill: #7ca1f3 !important;
}

.nav-link.active .lang-icon path {
  fill: #7ca1f3!important;
}
.nav-link.active .sdk-name {
  color: #7ca1f3 !important;
}
.nav-link:hover .sdk-name {
  color: #7ca1f3 !important;
}

.sdk-name {
  font-size: 16px;
  white-space: nowrap;
  text-align: center;
  padding-left: 12px;
}
.sdk-name:hover {
  color: var(--primary);
}

.nav-link,
.lang-icon {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  /* Flex */
}

.sidebar-actions {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.action-button {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  text-decoration: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.collapsed .action-button {
  justify-content: flex-start;
}

.collapsed .category-label {
  font-size: 0.625rem;
}

.collapsed .nav-link,
.collapsed .action-button {
  padding: 10px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #e9effd;
}

/* Material Icons adjustments */
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 1,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

/* Scrollbar styling */
.sdk-groups::-webkit-scrollbar {
  width: 4px;
}

.sdk-groups::-webkit-scrollbar-track {
  background: transparent;
}

.sdk-groups::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.sdk-groups::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.operation-nav {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: var(--surface);
  border-radius: 12px;
  margin-bottom: 24px;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.op-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 500;
  min-width: 200px;
}

.op-button:hover {
  color: var(--text);
  background: #f1f5f9;
}

.op-button.active {
  background: #7ca1f3;
  color: #0f285e;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.charts-container {
  padding: 24px;
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.5rem;
  margin: 0 0 8px 0;
  color: var(--text);
}

.section-description {
  color: var(--text-secondary);
  margin: 0;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.welcome-screen {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

.welcome-screen h1 {
  color: var(--text);
  margin-bottom: 16px;
}

@media (max-width: 350px) {
  .lang-icon {
    width: 20px;
    height: 20px;
  }
}
</style>

/**
 * Theme: theme-Serenity
 * Author: Serenity
 * Build: 2026-02-23 22:04:37
 * Fingerprint: 9be3ba56684a38db
 * Copyright © 2026 Serenity. All rights reserved.
 * Unauthorized copying or distribution is prohibited.
 */
document.addEventListener('DOMContentLoaded',function(){var filterBtns=document.querySelectorAll('.filter-btn');var photoItems=document.querySelectorAll('.photo-item');filterBtns.forEach(function(btn){btn.addEventListener('click',function(){var group=this.dataset.group;filterBtns.forEach(function(b){b.classList.remove('active');});this.classList.add('active');photoItems.forEach(function(item){if(group==='all'||item.dataset.group===group){item.classList.remove('hidden');}else{item.classList.add('hidden');}});});});SerenityLightbox.create({className:'photo-lightbox',delegateSelector:'.photo-wrapper img'});});